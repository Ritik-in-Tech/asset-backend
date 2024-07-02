import moment from "moment-timezone";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { Asset } from "../../models/asset.model.js";
import { UsageHistory } from "../../models/usagehistory.model.js";

const getConsumptionDataSpecificAssetPerMinute = asyncHandler(
  async (req, res) => {
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
      const consumptionKwh = asset.consumptionRate;

      // For simplicity, we assume categoryConsumption is calculated as shown
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

      const consumptionRateKWH = consumptionKwh; // KiloWatt per hour
      const consumptionRateRupees = categoryConsumption; // Rupees per hour

      const minuteConsumption = {};
      let onTime = null;

      usageHistoryDetails.stateDetails.forEach((detail, index) => {
        const time = moment(detail.time).tz("Asia/Kolkata");

        if (!minuteConsumption[time.format("YYYY-MM-DD HH:mm")]) {
          minuteConsumption[time.format("YYYY-MM-DD HH:mm")] = {
            kWh: 0,
            rupees: 0,
          };
        }

        if (detail.state === "On") {
          onTime = time;
        } else if (detail.state === "Off" && onTime) {
          const durationMinutes = moment
            .duration(time.diff(onTime))
            .asMinutes();

          for (let i = 0; i < durationMinutes; i++) {
            const minuteTime = moment(onTime)
              .add(i, "minutes")
              .format("YYYY-MM-DD HH:mm");
            if (!minuteConsumption[minuteTime]) {
              minuteConsumption[minuteTime] = { kWh: 0, rupees: 0 };
            }
            const consumptionPerMinuteKWH = consumptionRateKWH / 60;
            const consumptionPerMinuteRupees = consumptionRateRupees / 60;
            minuteConsumption[minuteTime].kWh += consumptionPerMinuteKWH;
            minuteConsumption[minuteTime].rupees += consumptionPerMinuteRupees;
          }

          onTime = null;
        }

        // If the asset remains "On" at the end of the data, assume it runs till the end of the last minute of the provided history.
        if (index === usageHistoryDetails.stateDetails.length - 1 && onTime) {
          const endOfLastMinute = moment(onTime).endOf("minute");
          const durationMinutes = moment
            .duration(endOfLastMinute.diff(onTime))
            .asMinutes();

          for (let i = 0; i < durationMinutes; i++) {
            const minuteTime = moment(onTime)
              .add(i, "minutes")
              .format("YYYY-MM-DD HH:mm");
            if (!minuteConsumption[minuteTime]) {
              minuteConsumption[minuteTime] = { kWh: 0, rupees: 0 };
            }
            const consumptionPerMinuteKWH = consumptionRateKWH / 60;
            const consumptionPerMinuteRupees = consumptionRateRupees / 60;
            minuteConsumption[minuteTime].kWh += consumptionPerMinuteKWH;
            minuteConsumption[minuteTime].rupees += consumptionPerMinuteRupees;
          }

          onTime = null;
        }
      });

      // Sort the keys and ensure no gaps
      const sortedKeys = Object.keys(minuteConsumption).sort();
      const filledMinuteConsumption = {};

      let currentTime = moment(sortedKeys[0]);
      const endTime = moment(sortedKeys[sortedKeys.length - 1]);

      while (currentTime <= endTime) {
        const timeString = currentTime.format("YYYY-MM-DD HH:mm");
        filledMinuteConsumption[timeString] = minuteConsumption[timeString] || {
          kWh: 0,
          rupees: 0,
        };
        currentTime.add(1, "minute");
      }

      // Round the consumption values
      for (const time in filledMinuteConsumption) {
        filledMinuteConsumption[time].kWh =
          Math.round(filledMinuteConsumption[time].kWh * 100) / 100; // Round to 2 decimal places
        filledMinuteConsumption[time].rupees = Math.round(
          filledMinuteConsumption[time].rupees
        );
      }

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            filledMinuteConsumption,
            "Per-minute consumption data retrieved successfully"
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
  }
);

const getConsumptionDataSpecificAssetPerHour = asyncHandler(
  async (req, res) => {
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

      const consumptionRateKWH = asset.consumptionRate; // KiloWatt per hour
      const consumptionRateRupees = consumptionRateKWH * 1.5; // Assume some conversion to Rupees per hour

      const hourlyConsumption = {};
      let onTime = null;

      usageHistoryDetails.stateDetails.forEach((detail, index) => {
        const time = moment(detail.time).tz("Asia/Kolkata");

        // Generate hour key (YYYY-MM-DD HH)
        const hourKey = time.format("YYYY-MM-DD HH");

        if (!hourlyConsumption[hourKey]) {
          hourlyConsumption[hourKey] = { kWh: 0, rupees: 0 };
        }

        if (detail.state === "On") {
          onTime = time;
        } else if (detail.state === "Off" && onTime) {
          const durationMinutes = moment
            .duration(time.diff(onTime))
            .asMinutes();

          for (let i = 0; i < durationMinutes; i++) {
            const minuteTime = moment(onTime).add(i, "minutes");
            const minuteHourKey = minuteTime.format("YYYY-MM-DD HH");

            // Ensure the hourKey exists in the map
            if (!hourlyConsumption[minuteHourKey]) {
              hourlyConsumption[minuteHourKey] = { kWh: 0, rupees: 0 };
            }

            const consumptionPerMinuteKWH = consumptionRateKWH / 60;
            const consumptionPerMinuteRupees = consumptionRateRupees / 60;

            hourlyConsumption[minuteHourKey].kWh += consumptionPerMinuteKWH;
            hourlyConsumption[minuteHourKey].rupees +=
              consumptionPerMinuteRupees;
          }

          onTime = null;
        }

        // Handle the case where the asset is still on at the end of the recorded data
        if (index === usageHistoryDetails.stateDetails.length - 1 && onTime) {
          const endOfLastMinute = moment(onTime).endOf("minute");
          const durationMinutes = moment
            .duration(endOfLastMinute.diff(onTime))
            .asMinutes();

          for (let i = 0; i < durationMinutes; i++) {
            const minuteTime = moment(onTime).add(i, "minutes");
            const minuteHourKey = minuteTime.format("YYYY-MM-DD HH");

            if (!hourlyConsumption[minuteHourKey]) {
              hourlyConsumption[minuteHourKey] = { kWh: 0, rupees: 0 };
            }

            const consumptionPerMinuteKWH = consumptionRateKWH / 60;
            const consumptionPerMinuteRupees = consumptionRateRupees / 60;

            hourlyConsumption[minuteHourKey].kWh += consumptionPerMinuteKWH;
            hourlyConsumption[minuteHourKey].rupees +=
              consumptionPerMinuteRupees;
          }

          onTime = null;
        }
      });

      // Round the consumption values
      for (const hour in hourlyConsumption) {
        hourlyConsumption[hour].kWh =
          Math.round(hourlyConsumption[hour].kWh * 100) / 100; // Round to 2 decimal places
        hourlyConsumption[hour].rupees = Math.round(
          hourlyConsumption[hour].rupees
        );
      }

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            hourlyConsumption,
            "Hourly consumption data retrieved successfully"
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
            "An error occurred while calculating hourly consumption data"
          )
        );
    }
  }
);

const getConsumptionDataSpecificAssetPerDay = asyncHandler(async (req, res) => {
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

    const consumptionRateKWH = asset.consumptionRate; // KiloWatt per hour
    const consumptionRateRupees = consumptionRateKWH * 1.5; // Assume some conversion to Rupees per hour

    const dailyConsumption = {};
    let onTime = null;

    usageHistoryDetails.stateDetails.forEach((detail, index) => {
      const time = moment(detail.time).tz("Asia/Kolkata");

      // Generate day key (YYYY-MM-DD)
      const dayKey = time.format("YYYY-MM-DD");

      if (!dailyConsumption[dayKey]) {
        dailyConsumption[dayKey] = { kWh: 0, rupees: 0 };
      }

      if (detail.state === "On") {
        onTime = time;
      } else if (detail.state === "Off" && onTime) {
        const durationMinutes = moment.duration(time.diff(onTime)).asMinutes();

        for (let i = 0; i < durationMinutes; i++) {
          const minuteTime = moment(onTime).add(i, "minutes");
          const minuteDayKey = minuteTime.format("YYYY-MM-DD");

          // Ensure the dayKey exists in the map
          if (!dailyConsumption[minuteDayKey]) {
            dailyConsumption[minuteDayKey] = { kWh: 0, rupees: 0 };
          }

          const consumptionPerMinuteKWH = consumptionRateKWH / 60;
          const consumptionPerMinuteRupees = consumptionRateRupees / 60;

          dailyConsumption[minuteDayKey].kWh += consumptionPerMinuteKWH;
          dailyConsumption[minuteDayKey].rupees += consumptionPerMinuteRupees;
        }

        onTime = null;
      }

      // Handle the case where the asset is still on at the end of the recorded data
      if (index === usageHistoryDetails.stateDetails.length - 1 && onTime) {
        const endOfLastMinute = moment(onTime).endOf("minute");
        const durationMinutes = moment
          .duration(endOfLastMinute.diff(onTime))
          .asMinutes();

        for (let i = 0; i < durationMinutes; i++) {
          const minuteTime = moment(onTime).add(i, "minutes");
          const minuteDayKey = minuteTime.format("YYYY-MM-DD");

          if (!dailyConsumption[minuteDayKey]) {
            dailyConsumption[minuteDayKey] = { kWh: 0, rupees: 0 };
          }

          const consumptionPerMinuteKWH = consumptionRateKWH / 60;
          const consumptionPerMinuteRupees = consumptionRateRupees / 60;

          dailyConsumption[minuteDayKey].kWh += consumptionPerMinuteKWH;
          dailyConsumption[minuteDayKey].rupees += consumptionPerMinuteRupees;
        }

        onTime = null;
      }
    });

    // Round the consumption values
    for (const day in dailyConsumption) {
      dailyConsumption[day].kWh =
        Math.round(dailyConsumption[day].kWh * 100) / 100; // Round to 2 decimal places
      dailyConsumption[day].rupees = Math.round(dailyConsumption[day].rupees);
    }

    // Sort the dailyConsumption by day
    const sortedDailyConsumption = Object.keys(dailyConsumption)
      .sort()
      .reduce((acc, key) => {
        acc[key] = dailyConsumption[key];
        return acc;
      }, {});

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          sortedDailyConsumption,
          "Daily consumption data retrieved successfully"
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
          "An error occurred while calculating daily consumption data"
        )
      );
  }
});

export {
  getConsumptionDataSpecificAssetPerMinute,
  getConsumptionDataSpecificAssetPerHour,
  getConsumptionDataSpecificAssetPerDay,
};
