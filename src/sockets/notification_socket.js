import { User } from "../models/user.model.js";
import NotificationModel from "../models/notificationmodel.js";
import { sendNotification } from "../controllers/notification.controller.js";
import { addUsageHistory } from "../controllers/usagehistory/addusagehistory.controller.js";
import { Asset } from "../models/asset.model.js";

let issueNsp;

export function initializeNotificationSocket(io) {
  try {
    console.log("***** Io Notifcation started *****");

    issueNsp = io.of("/sockets");

    async function getAndEmitRealtimeData(socket, assetId, state) {
      try {
        // Check if assetId is an object and extract the id
        const actualAssetId =
          typeof assetId === "object" ? assetId.assetId : assetId;

        if (!actualAssetId) {
          socket.emit("realtime-data-error", "Invalid asset ID provided");
          return;
        }

        const asset = await Asset.findById(actualAssetId);
        if (!asset) {
          socket.emit("realtime-data-error", "Provided asset does not exist");
          return;
        }

        const now = new Date();
        const istOptions = {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        };

        let realtimeData;

        if (state === "Off") {
          realtimeData = {
            timestamp: now.toLocaleString("en-IN", istOptions),
            consumptionRateKWH: 0,
            consumptionRateRupees: 0,
          };
        } else {
          const targetCategory = asset.fuelType;
          const consumptionKwh = asset.consumptionRate;
          const categoryConsumption = consumptionKwh * 1.5;

          if (!categoryConsumption) {
            socket.emit(
              "realtime-data-error",
              `Consumption rate for category '${targetCategory}' not found`
            );
            return;
          }

          const consumptionRateKWH = consumptionKwh;
          const consumptionRateRupees = categoryConsumption;

          realtimeData = {
            timestamp: now.toLocaleString("en-IN", istOptions),
            consumptionRateKWH,
            consumptionRateRupees,
          };
        }

        socket.emit("realtime-data-update", realtimeData);
      } catch (error) {
        console.error("Error fetching realtime data:", error);
        socket.emit(
          "realtime-data-error",
          `Failed to fetch realtime data: ${error.message}`
        );
      }
    }

    issueNsp.on("connection", (socket) => {
      console.log("User Connected: ", socket.id);

      socket.on("user-joined", (username) => {
        socket.username = username;
        console.log(`User connected on home page: ${username}`);
        socket.join(username);
      });

      socket.on("request-realtime-data", (assetId) => {
        getAndEmitRealtimeData(socket, assetId, "Off");
      });

      socket.on("asset-state-change", async (data) => {
        try {
          const { userId, assetId, state } = data;
          const result = await addUsageHistory(userId, assetId, state);

          if (result.success) {
            issueNsp.to(userId).emit("asset-state-updated", result.data);
            getAndEmitRealtimeData(socket, assetId, state);
          } else {
            socket.emit("asset-state-update-error", result.message);
          }
        } catch (error) {
          console.error("Error handling asset state change:", error);
          socket.emit("asset-state-update-error", "An error occurred");
        }
      });

      socket.on("disconnect", () => {
        console.log("User Disconnected", socket.id);
        const rooms = Object.keys(socket.rooms);
        rooms.forEach((room) => {
          socket.leave(room);
          console.log(`User left room ${room}`);
        });
      });
    });

    return issueNsp;
  } catch (error) {
    console.error("Error initializing activity socket:", error);
    throw error;
  }
}

export async function emitNewNotificationEvent(userId, eventData) {
  if (issueNsp) {
    // console.log("This is event data : "  , eventData);
    if (
      !userId ||
      !eventData ||
      !eventData.content ||
      !eventData.createdDate ||
      !eventData.notificationCategory
    ) {
      return;
    }

    await User.updateOne(
      { _id: userId },
      {
        $inc: {
          notificationViewCounter: 1,
        },
      }
    );

    let data = await NotificationModel.create({ ...eventData, userId });

    //  console.log("this is data " , data);

    //  console.log(result);

    //  console.log("This is userid where notification is sent : " , userId);

    issueNsp.to(userId).emit("new-notification", eventData);

    await sendNotification(userId, eventData.content);
  } else {
    throw new Error(
      "Socket.io not initialized. Call initializeActivitySocket(server) first."
    );
  }
}

export async function emitNewNotificationAndAddBusinessEvent(
  userId,
  businessId,
  eventData,
  newBusiness
) {
  if (issueNsp) {
    console.log("This is event data : ", eventData, userId);
    if (
      !userId ||
      !eventData ||
      !eventData.content ||
      !eventData.createdDate ||
      !eventData.notificationCategory
    ) {
      return;
    }

    console.log("This mishra.......");

    await User.updateOne(
      { _id: userId },
      {
        $inc: {
          notificationViewCounter: 1,
        },
      }
    );

    console.log("This is userid", userId);

    console.log("This is eventData : ", eventData);
    console.log("This is newBusiness : ", newBusiness);

    const data = {
      eventData: eventData,
      newBusiness: newBusiness,
    };

    console.log("This is data }", data);
    issueNsp.to(userId).emit("new-notification-add-business", data);

    sendNotification(userId, eventData.content);
  } else {
    throw new Error(
      "Socket.io not initialized. Call initializeActivitySocket(server) first."
    );
  }
}
