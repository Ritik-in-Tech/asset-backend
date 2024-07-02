import { Asset } from "../../models/asset.model.js";
import moment from "moment-timezone";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { Business } from "../../models/business.model.js";
import { BusinessUsers } from "../../models/businessusers.model.js";
import { UsageHistory } from "../../models/usagehistory.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { getCurrentIndianTime } from "../../utils/helpers/time.helper.js";
import { Settings } from "../../models/settings.model.js";
import { User } from "../../models/user.model.js";
import createRealtimeDataSender from "../../utils/helpers/realtime.helper.js";
import { emitRealtimeData } from "../../sockets/emit_data_socket.js";
import { emitAssetSpecificRealtimeData } from "./emitassetspecificdata.controller.js";

const addUsageHistory = asyncHandler(async (req, res) => {
  try {
    const { state } = req.body;
    const assetId = req.params.assetId;
    const businessId = req.params.businessId;

    const userId = req.user._id;
    if (!userId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Invalid token please log in again"));
    }
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "User does not exist"));
    }

    if (!assetId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Asset ID is required"));
    }

    if (!businessId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Business ID is required"));
    }

    const asset = await Asset.findById(assetId);
    if (!asset) {
      return res.status(404).json(new ApiResponse(404, {}, "Asset not found"));
    }

    const business = await Business.findById(businessId);
    if (!business) {
      return res
        .status(404)
        .json(new ApiResponse(404, {}, "Business not found"));
    }

    const businessuser = await BusinessUsers.findOne({
      businessId: businessId,
      userId: userId,
    });

    if (!businessuser) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "Logged in user is not assigned with the business"
          )
        );
    }

    if (businessuser.role !== "Operator") {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Only operator can operate the asset"));
    }

    if (asset.operator[0].operatorId.toString() !== userId) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "Logged in user is not assigned to operate this asset"
          )
        );
    }

    // Fetch the latest usage history for the asset
    let latestUsageHistory = await UsageHistory.findOne({
      assetID: assetId,
    }).sort({ createdDate: -1 });

    if (latestUsageHistory) {
      const latestStateDetail =
        latestUsageHistory.stateDetails[
          latestUsageHistory.stateDetails.length - 1
        ];

      if (latestStateDetail.state === state) {
        return res
          .status(400)
          .json(
            new ApiResponse(400, {}, "Consecutive states cannot be the same")
          );
      }

      // Add the new state detail to the existing usage history
      latestUsageHistory.stateDetails.push({
        state: state,
        time: new Date(),
      });
      await latestUsageHistory.save();

      // Emit real-time data for the updated state
      await emitAssetSpecificRealtimeData(userId, asset, state);

      return res
        .status(201)
        .json(
          new ApiResponse(
            201,
            latestUsageHistory,
            "Usage history updated successfully"
          )
        );
    }

    // If no usage history exists, create a new one
    const newUsageHistory = new UsageHistory({
      stateDetails: [{ state: state, time: new Date() }],
      businessId: businessId,
      assetID: assetId,
      createdDate: new Date(),
    });

    // Save the usage history data
    const savedUsageHistory = await newUsageHistory.save();

    // Push the new usage history ID to the asset
    asset.usageHistory.push({ usageHistoryId: savedUsageHistory._id });
    await asset.save();

    // Emit real-time data for the new state
    await emitAssetSpecificRealtimeData(userId, asset, state);

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          savedUsageHistory,
          "Usage history added successfully"
        )
      );
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          { error },
          "An error occurred while adding usage history"
        )
      );
  }
});

const getUsageHistory = asyncHandler(async (req, res) => {
  try {
    const assetId = req.params.assetId;

    if (!assetId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Asset ID is required"));
    }

    const usageHistoryDetails = await UsageHistory.findOne({
      assetID: assetId,
    });

    if (!usageHistoryDetails) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "Provided asset does not have any usage histories"
          )
        );
    }

    // Group stateDetails by date
    const groupedByDate = usageHistoryDetails.stateDetails.reduce(
      (acc, detail) => {
        const date = moment(detail.time)
          .tz("Asia/Kolkata")
          .format("YYYY-MM-DD");
        const time = moment(detail.time).tz("Asia/Kolkata").format("HH:mm");

        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push({ state: detail.state, time: time });

        return acc;
      },
      {}
    );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          groupedByDate,
          "Usage history retrieved successfully"
        )
      );
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          { error },
          "An error occurred while retrieving usage history"
        )
      );
  }
});

const getBusinessConsumptionData = asyncHandler(async (req, res) => {
  try {
    const businessId = req.params.businessId;
    if (!businessId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Business ID is required"));
    }

    const usageHistories = await UsageHistory.find({ businessId: businessId });
    if (usageHistories.length === 0) {
      return res
        .status(400)
        .json(
          new ApiResponse(400, {}, "No usage histories found for this business")
        );
    }

    const businessConsumption = {};

    for (const usageHistory of usageHistories) {
      const assetId = usageHistory.assetID;

      const asset = await Asset.findById(assetId);

      const targetCategory = asset.fuelType;
      console.log(targetCategory);

      const consumptionKwh = asset.consumptionRate;
      console.log(consumptionKwh);

      const categoryConsumption = consumptionKwh * 1.5;

      const consumptionRateKWH = consumptionKwh; // this is in KiloWatt per hour
      const consumptionRateRupees = categoryConsumption; // this is in rupees per hour

      let onTime = null;

      usageHistory.stateDetails.forEach((detail, index) => {
        const date = moment(detail.time)
          .tz("Asia/Kolkata")
          .format("YYYY-MM-DD");
        const time = moment(detail.time).tz("Asia/Kolkata");

        if (!businessConsumption[date]) {
          businessConsumption[date] = { kWh: 0, rupees: 0 };
        }

        if (detail.state === "On") {
          onTime = time;
        } else if (detail.state === "Off" && onTime) {
          const durationHours = moment.duration(time.diff(onTime)).asHours();
          businessConsumption[date].kWh += durationHours * consumptionRateKWH;
          businessConsumption[date].rupees +=
            durationHours * consumptionRateRupees;
          onTime = null;
        }

        if (index === usageHistory.stateDetails.length - 1 && onTime) {
          // Assuming the asset runs until the end of the day
          const endOfDay = moment(onTime).endOf("day");
          const durationHours = moment
            .duration(endOfDay.diff(onTime))
            .asHours();
          businessConsumption[date].kWh += durationHours * consumptionRateKWH;
          businessConsumption[date].rupees +=
            durationHours * consumptionRateRupees;
          onTime = null; // Reset after final calculation
        }
      });
    }

    // Round the consumption values
    for (const date in businessConsumption) {
      businessConsumption[date].kWh =
        Math.round(businessConsumption[date].kWh * 100) / 100; // Round to 2 decimal places
      businessConsumption[date].rupees = Math.round(
        businessConsumption[date].rupees
      );
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          businessConsumption,
          "Business consumption data retrieved successfully"
        )
      );
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          { error },
          "An error occurred while calculating business consumption data"
        )
      );
  }
});

const getRealtimeDataSpecificAsset = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "User ID is required"));
    }

    const assetId = req.params.assetId;
    if (!assetId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Asset ID is required"));
    }

    const asset = await Asset.findById(assetId);
    if (!asset) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Provided asset does not exist"));
    }

    const targetCategory = asset.fuelType;
    console.log(targetCategory);

    const consumptionKwh = asset.consumptionRate;
    console.log(consumptionKwh);

    const categoryConsumption = consumptionKwh * 1.5; // Example multiplier

    if (!categoryConsumption) {
      return res
        .status(404)
        .json(
          new ApiResponse(
            404,
            {},
            `Consumption rate for category '${targetCategory}' not found`
          )
        );
    }

    const consumptionRateKWH = consumptionKwh; // in KiloWatt per hour
    const consumptionRateRupees = categoryConsumption; // in rupees per hour

    // Prepare the data to emit
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
    const timestamp = now.toLocaleString("en-IN", istOptions);

    const realTimeData = {
      timestamp,
      consumptionRateKWH,
      consumptionRateRupees,
    };

    emitRealtimeData(userId.toString(), realTimeData);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          realTimeData,
          `Real-time data for asset ${asset.name} fetched successfully`
        )
      );
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(new ApiResponse(500, { error }, "Internal server error"));
  }
});

export {
  addUsageHistory,
  getUsageHistory,
  getBusinessConsumptionData,
  getRealtimeDataSpecificAsset,
};
