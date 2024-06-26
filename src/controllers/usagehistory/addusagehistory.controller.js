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

export const addUsageHistory = async (userId, assetId, state) => {
  try {
    // Fetch the user
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, message: "User does not exist" };
    }

    // Fetch the asset
    const asset = await Asset.findById(assetId);
    if (!asset) {
      return { success: false, message: "Asset not found" };
    }

    // Fetch the business
    const business = await Business.findById(asset.businessId);
    if (!business) {
      return { success: false, message: "Business not found" };
    }

    // Check if user is assigned to the business
    const businessuser = await BusinessUsers.findOne({
      businessId: business._id,
      userId: userId,
    });

    if (!businessuser || businessuser.role !== "Operator") {
      return {
        success: false,
        message: "User is not authorized to operate this asset",
      };
    }

    // Check if user is assigned to operate this asset
    if (asset.operator[0].operatorId.toString() !== userId) {
      return {
        success: false,
        message: "User is not assigned to operate this asset",
      };
    }

    // Fetch the latest usage history for the asset
    let latestUsageHistory = await UsageHistory.findOne({
      assetID: assetId,
    }).sort({ createdDate: -1 });

    // If usage history exists, check for consecutive states
    if (latestUsageHistory) {
      const latestStateDetail =
        latestUsageHistory.stateDetails[
          latestUsageHistory.stateDetails.length - 1
        ];

      // Check if the latest state is the same as the new state being added
      if (latestStateDetail.state === state) {
        return {
          success: false,
          message: "Consecutive states cannot be the same",
        };
      }

      // Add the new state detail to the existing usage history
      latestUsageHistory.stateDetails.push({
        state: state,
        time: getCurrentIndianTime(),
      });
      await latestUsageHistory.save();

      return {
        success: true,
        data: latestUsageHistory,
        message: "Usage history updated successfully",
      };
    }

    // If no usage history exists, create a new one
    const newUsageHistory = new UsageHistory({
      stateDetails: [{ state: state, time: getCurrentIndianTime() }],
      businessId: business._id,
      assetID: assetId,
    });

    // Save the usage history data
    const savedUsageHistory = await newUsageHistory.save();

    // Push the new usage history ID to the asset
    asset.usageHistory.push({ usageHistoryId: savedUsageHistory._id });
    await asset.save();

    return {
      success: true,
      data: savedUsageHistory,
      message: "Usage history added successfully",
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "An error occurred while adding usage history",
    };
  }
};

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

const getConsumptionDataSpecificAsset = asyncHandler(async (req, res) => {
  try {
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

    const targetCategory = asset.fuelType;
    console.log(targetCategory);

    const consumptionKwh = asset.consumptionRate;
    console.log(consumptionKwh);

    // const categoryConsumption = settings.consumption.find(
    //   (item) => item.category.toLowerCase() === targetCategory.toLowerCase()
    // );

    const categoryConsumption = consumptionKwh * 1.5;

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

    const consumptionRateKWH = consumptionKwh; // this is in KiloWatt per hour
    const consumptionRateRupees = categoryConsumption; // this is in rupees per hour

    console.log(
      `Consumption rate for ${targetCategory}: ${consumptionRateKWH} KWH, ${consumptionRateRupees} Rupees/hour`
    );

    const dailyConsumption = {};
    let onTime = null;

    usageHistoryDetails.stateDetails.forEach((detail, index) => {
      const date = moment(detail.time).tz("Asia/Kolkata").format("YYYY-MM-DD");
      const time = moment(detail.time).tz("Asia/Kolkata");

      // console.log(date);
      // console.log(time);

      if (!dailyConsumption[date]) {
        dailyConsumption[date] = { kWh: 0, rupees: 0 };
      }

      if (detail.state === "On") {
        onTime = time;
      } else if (detail.state === "Off" && onTime) {
        const durationHours = moment.duration(time.diff(onTime)).asHours();
        dailyConsumption[date].kWh += durationHours * consumptionRateKWH;
        dailyConsumption[date].rupees += durationHours * consumptionRateRupees;
        onTime = null;
      }

      if (index === usageHistoryDetails.stateDetails.length - 1 && onTime) {
        // Assuming the asset runs until the end of the day
        const endOfDay = moment(onTime).endOf("day");
        const durationHours = moment.duration(endOfDay.diff(onTime)).asHours();
        dailyConsumption[date].kWh += durationHours * consumptionRateKWH;
        dailyConsumption[date].rupees += durationHours * consumptionRateRupees;
        onTime = null; // Reset after final calculation
      }
    });

    // Round the consumption values
    for (const date in dailyConsumption) {
      dailyConsumption[date].kWh =
        Math.round(dailyConsumption[date].kWh * 100) / 100; // Round to 2 decimal places
      dailyConsumption[date].rupees = Math.round(dailyConsumption[date].rupees);
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          dailyConsumption,
          "Consumption data retrieved successfully"
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
          "An error occurred while calculating consumption data"
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

    const categoryConsumption = consumptionKwh * 1.5;

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

    const consumptionRateKWH = consumptionKwh; // this is in KiloWatt per hour
    const consumptionRateRupees = categoryConsumption; // this is in rupees per hour

    const getData = () => {
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
      return {
        timestamp: now.toLocaleString("en-IN", istOptions),
        consumptionRateKWH,
        consumptionRateRupees,
      };
    };

    const sendRealtimeData = createRealtimeDataSender(getData);

    return sendRealtimeData(req, res);
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
  getConsumptionDataSpecificAsset,
  getBusinessConsumptionData,
  getRealtimeDataSpecificAsset,
};
