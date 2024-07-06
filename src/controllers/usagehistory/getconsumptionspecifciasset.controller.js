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

const getConsumptionDataSpecificAssetTodayPerHour = asyncHandler(
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

      const startOfDay = moment().tz("Asia/Kolkata").startOf("day");
      const endOfDay = moment().tz("Asia/Kolkata").endOf("day");
      const currentTime = moment().tz("Asia/Kolkata");

      const consumptionRateKWH = asset.consumptionRate;
      const consumptionRateRupees = consumptionRateKWH * 1.5;

      const hourlyConsumption = {};

      const todayStateDetails = usageHistoryDetails.stateDetails.filter(
        (detail) =>
          moment(detail.time)
            .tz("Asia/Kolkata")
            .isBetween(startOfDay, endOfDay, null, "[]")
      );

      let onTime = null;
      let firstOnTime = null;

      todayStateDetails.forEach((detail, index) => {
        const time = moment(detail.time).tz("Asia/Kolkata");

        if (detail.state === "On") {
          onTime = time;
          if (!firstOnTime) {
            firstOnTime = time;
          }
        } else if (detail.state === "Off" && onTime) {
          calculateConsumption(onTime, time);
          onTime = null;
        }

        // Handle case where the asset is still on at the current time
        if (index === todayStateDetails.length - 1 && onTime) {
          calculateConsumption(onTime, currentTime);
        }
      });

      function calculateConsumption(start, end) {
        let currentHour = start.clone().startOf("hour");
        while (
          currentHour.isBefore(end) &&
          currentHour.isSameOrBefore(currentTime)
        ) {
          const nextHour = moment.min(
            currentHour.clone().add(1, "hour"),
            end,
            currentTime
          );
          const consumptionStart = moment.max(start, currentHour);
          const consumptionEnd = moment.min(end, nextHour);

          const durationHours = moment
            .duration(consumptionEnd.diff(consumptionStart))
            .asHours();
          const hourKey = currentHour.format("HH:mm");

          if (!hourlyConsumption[hourKey]) {
            hourlyConsumption[hourKey] = { kWh: 0, rupees: 0 };
          }

          hourlyConsumption[hourKey].kWh += durationHours * consumptionRateKWH;
          hourlyConsumption[hourKey].rupees +=
            durationHours * consumptionRateRupees;

          currentHour = nextHour;
        }
      }

      // Convert hourlyConsumption object to array and round values
      const consumptionArray = Object.entries(hourlyConsumption).map(
        ([hour, consumption]) => ({
          hour,
          kWh: Math.round(consumption.kWh * 100) / 100,
          rupees: Math.round(consumption.rupees * 100) / 100,
        })
      );

      // Sort the array by hour
      consumptionArray.sort((a, b) =>
        moment(a.hour, "HH:mm").diff(moment(b.hour, "HH:mm"))
      );

      const responseMessage = firstOnTime
        ? `Hourly consumption for ${
            asset.name
          } retrieved from ${firstOnTime.format(
            "HH:mm"
          )} till ${currentTime.format("HH:mm")}`
        : `No consumption data available for ${asset.name} today`;

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { hourlyConsumption: consumptionArray },
            responseMessage
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

const getConsumptionDataSpecificAssetToday = asyncHandler(async (req, res) => {
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

    const startOfDay = moment().tz("Asia/Kolkata").startOf("day");
    const endOfDay = moment().tz("Asia/Kolkata").endOf("day");
    const currentTime = moment().tz("Asia/Kolkata");
    console.log(startOfDay);
    console.log(endOfDay);
    console.log(currentTime);

    const consumptionRateKWH = asset.consumptionRate; // KiloWatt per hour
    const consumptionRateRupees = consumptionRateKWH * 1.5; // Assume some conversion to Rupees per hour

    const businessConsumption = {};
    let onTime = null;

    const todayStateDetails = usageHistoryDetails.stateDetails.filter(
      (detail) =>
        moment(detail.time).tz("Asia/Kolkata").isBetween(startOfDay, endOfDay)
    );

    todayStateDetails.forEach((detail, index) => {
      const date = moment(detail.time).tz("Asia/Kolkata").format("YYYY-MM-DD");
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

      if (index === todayStateDetails.length - 1 && onTime) {
        const effectiveEndTime = currentTime.isBefore(endOfDay)
          ? currentTime
          : endOfDay;
        const durationHours = moment
          .duration(effectiveEndTime.diff(onTime))
          .asHours();
        businessConsumption[date].kWh += durationHours * consumptionRateKWH;
        businessConsumption[date].rupees +=
          durationHours * consumptionRateRupees;
        onTime = null; // Reset after final calculation
      }
    });
    const today = moment();
    console.log(businessConsumption);
    let consumption = businessConsumption[startOfDay.format("YYYY-MM-DD")];
    console.log(consumption);
    if (todayStateDetails.length === 0) {
      consumption = {
        kWh: 0,
        rupees: 0,
      };
    } else {
      consumption = {
        kWh: Math.floor(consumption.kWh),
        rupees: Math.floor(consumption.rupees),
      };
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { consumption },
          `Consumption for ${asset.name} retrieved till ${currentTime}`
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

const getConsumptionDataSpecificAssetSpecificDay = asyncHandler(
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

      const specificDate = req.query.date;
      if (!specificDate) {
        return res
          .status(400)
          .json(
            new ApiResponse(400, {}, "Please provide specific date in query")
          );
      }
      const formattedDate = specificDate
        ? moment(specificDate, "YYYY/MM/DD").format("YYYY-MM-DD")
        : null;

      const startOfDay = moment(formattedDate)
        .tz("Asia/Kolkata")
        .startOf("day");
      const endOfDay = moment(formattedDate).tz("Asia/Kolkata").endOf("day");
      const currentTime = moment().tz("Asia/Kolkata");
      console.log(startOfDay);
      console.log(endOfDay);
      console.log(currentTime);

      const businessConsumption = {};
      const consumptionKwh = asset.consumptionRate;
      const categoryConsumption = consumptionKwh * 1.5;

      const consumptionRateKWH = consumptionKwh;
      const consumptionRateRupees = categoryConsumption;

      let onTime = null;
      const todayStateDetails = usageHistoryDetails.stateDetails.filter(
        (detail) =>
          moment(detail.time).tz("Asia/Kolkata").isBetween(startOfDay, endOfDay)
      );

      console.log(todayStateDetails);

      todayStateDetails.forEach((detail, index) => {
        const date = moment(detail.time)
          .tz("Asia/Kolkata")
          .format("YYYY-MM-DD");
        const time = moment(detail.time).tz("Asia/Kolkata");

        if (formattedDate && date !== formattedDate) {
          return;
        }

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

        if (index === todayStateDetails.length - 1 && onTime) {
          const effectiveEndTime = currentTime.isBefore(endOfDay)
            ? currentTime
            : endOfDay;
          const durationHours = moment
            .duration(effectiveEndTime.diff(onTime))
            .asHours();
          businessConsumption[date].kWh += durationHours * consumptionRateKWH;
          businessConsumption[date].rupees +=
            durationHours * consumptionRateRupees;
          onTime = null;
        }
      });
      let consumption = businessConsumption[formattedDate];
      if (todayStateDetails.length === 0) {
        consumption = {
          kWh: 0,
          rupees: 0,
        };
      } else {
        consumption = {
          kWh: Math.floor(consumption.kWh),
          rupees: Math.floor(consumption.rupees),
        };
      }
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { consumption },
            `Consumption for ${asset.name} retrieved till ${currentTime}`
          )
        );
    } catch (error) {
      console.log(error);
      return res
        .status(500)
        .json(new ApiResponse(500, { error }, "Internal server error"));
    }
  }
);

const getConsumptionSpecificAssetLastNDay = asyncHandler(async (req, res) => {
  try {
    const { assetId, nthDays } = req.params;
    if (!assetId || !nthDays) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Asset ID and Ndays is required"));
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

    // Calculate the date range for the last n days including today
    const endDate = moment().tz("Asia/Kolkata").endOf("day");
    console.log(endDate);
    const startDate = moment()
      .tz("Asia/Kolkata")
      .startOf("day")
      .subtract(nthDays - 1, "days");
    console.log(startDate);

    const dateArray = [];
    let currentDate = startDate.clone();

    while (currentDate <= endDate) {
      dateArray.push(currentDate.format("YYYY-MM-DD"));
      currentDate.add(1, "days");
    }

    let NdaysMap = new Map();

    // loop for those N days
    for (const specificDate of dateArray) {
      // console.log(specificDate);
      const formattedDate = specificDate
        ? moment(specificDate, "YYYY/MM/DD").format("YYYY-MM-DD")
        : null;

      const startOfDay = moment(formattedDate)
        .tz("Asia/Kolkata")
        .startOf("day");
      const endOfDay = moment(formattedDate).tz("Asia/Kolkata").endOf("day");
      const currentTime = moment().tz("Asia/Kolkata");
      // console.log(startOfDay);
      // console.log(endOfDay);
      // console.log(currentTime);

      const businessConsumption = {};
      const consumptionKwh = asset.consumptionRate;
      const categoryConsumption = consumptionKwh * 1.5;

      const consumptionRateKWH = consumptionKwh;
      const consumptionRateRupees = categoryConsumption;

      let onTime = null;
      const todayStateDetails = usageHistoryDetails.stateDetails.filter(
        (detail) =>
          moment(detail.time).tz("Asia/Kolkata").isBetween(startOfDay, endOfDay)
      );

      // console.log(todayStateDetails);

      todayStateDetails.forEach((detail, index) => {
        const date = moment(detail.time)
          .tz("Asia/Kolkata")
          .format("YYYY-MM-DD");
        const time = moment(detail.time).tz("Asia/Kolkata");

        if (formattedDate && date !== formattedDate) {
          return;
        }

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

        if (index === todayStateDetails.length - 1 && onTime) {
          const effectiveEndTime = currentTime.isBefore(endOfDay)
            ? currentTime
            : endOfDay;
          const durationHours = moment
            .duration(effectiveEndTime.diff(onTime))
            .asHours();
          businessConsumption[date].kWh += durationHours * consumptionRateKWH;
          businessConsumption[date].rupees +=
            durationHours * consumptionRateRupees;
          onTime = null;
        }
      });
      let consumption = businessConsumption[formattedDate];
      if (todayStateDetails.length === 0) {
        consumption = {
          kWh: 0,
          rupees: 0,
        };
      } else {
        consumption = {
          kWh: Math.floor(consumption.kWh),
          rupees: Math.floor(consumption.rupees),
        };
      }

      NdaysMap.set(formattedDate, consumption);
    }

    console.log(NdaysMap);
    const LastNDaysObject = Object.fromEntries(NdaysMap);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { LastNDaysConsumption: LastNDaysObject },
          "Consumption retrieved successfully"
        )
      );
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(new ApiResponse(500, { error }, "Internal Server error"));
  }
});

export {
  getConsumptionDataSpecificAssetPerMinute,
  getConsumptionDataSpecificAssetTodayPerHour,
  getConsumptionDataSpecificAssetToday,
  getConsumptionDataSpecificAssetSpecificDay,
  getConsumptionSpecificAssetLastNDay,
};
