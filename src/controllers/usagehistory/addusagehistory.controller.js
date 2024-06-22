import { Asset } from "../../models/asset.model.js";
import moment from "moment-timezone";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { Business } from "../../models/business.model.js";
import { BusinessUsers } from "../../models/businessusers.model.js";
import { UsageHistory } from "../../models/usagehistory.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { getCurrentIndianTime } from "../../utils/helpers/time.helper.js";
import { Settings } from "../../models/settings.model.js";

const addUsageHistory = asyncHandler(async (req, res) => {
  try {
    const { state } = req.body;
    const assetId = req.params.assetId;
    const businessId = req.params.businessId;

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
        return res
          .status(400)
          .json(
            new ApiResponse(400, {}, "Consecutive states cannot be the same")
          );
      }

      // Add the new state detail to the existing usage history
      latestUsageHistory.stateDetails.push({
        state: state,
        time: getCurrentIndianTime(),
      });
      await latestUsageHistory.save();

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
      stateDetails: [{ state: state, time: getCurrentIndianTime() }],
      businessId: businessId,
      assetID: assetId,
    });

    // Save the usage history data
    const savedUsageHistory = await newUsageHistory.save();

    // Push the new usage history ID to the asset
    asset.usageHistory.push({ usageHistoryId: savedUsageHistory._id });
    await asset.save();

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
        new ApiResponse(500, {}, "An error occurred while adding usage history")
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
          {},
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

    const settings = await Settings.findOne({ assetId: assetId });
    if (!settings) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Please add settings data"));
    }

    const targetCategory = asset.consumptionCategories;

    const categoryConsumption = settings.consumption.find(
      (item) => item.category.toLowerCase() === targetCategory.toLowerCase()
    );

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

    const consumptionRateKWH = asset.consumptionRate; // this is in KiloWatt per hour
    const consumptionRateRupees = categoryConsumption.consumptionRate; // this is in rupees per hour

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
          {},
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

      // Fetch asset details
      const asset = await Asset.findById(assetId);
      if (!asset) continue; // Skip if asset not found

      // Fetch settings for the asset
      const settings = await Settings.findOne({ assetId: assetId });
      if (!settings) continue; // Skip if settings not found

      const targetCategory = asset.consumptionCategories;
      const categoryConsumption = settings.consumption.find(
        (item) => item.category.toLowerCase() === targetCategory.toLowerCase()
      );
      if (!categoryConsumption) continue; // Skip if category not found

      const consumptionRateKWH = asset.consumptionRate; // this is in KiloWatt per hour
      const consumptionRateRupees = categoryConsumption.consumptionRate; // this is in rupees per hour

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
          {},
          "An error occurred while calculating business consumption data"
        )
      );
  }
});

export {
  addUsageHistory,
  getUsageHistory,
  getConsumptionDataSpecificAsset,
  getBusinessConsumptionData,
};
