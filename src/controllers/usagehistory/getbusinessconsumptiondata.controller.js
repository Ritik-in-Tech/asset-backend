import { Asset } from "../../models/asset.model.js";
import moment from "moment-timezone";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { UsageHistory } from "../../models/usagehistory.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

const getBusinessConsumptionDataPerDay = asyncHandler(async (req, res) => {
  try {
    const businessId = req.params.businessId;
    if (!businessId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Business ID is required"));
    }

    const businessConsumption = {};
    const { fuelType } = req.body;
    let assetDetails;
    let query = { businessId: businessId };

    if (fuelType) {
      query.fuelType = fuelType;
    }

    assetDetails = await Asset.find(query).populate({
      path: "usageHistory.usageHistoryId",
      model: "UsageHistory",
    });

    console.log(assetDetails);

    let usageHistories = assetDetails.flatMap((asset) =>
      asset.usageHistory.map((history) => history.usageHistoryId)
    );

    console.log(usageHistories);

    for (const usageHistory of usageHistories) {
      const assetId = usageHistory.assetID;
      const asset = await Asset.findById(assetId);

      const targetCategory = asset.fuelType;
      console.log(targetCategory);

      const consumptionKwh = asset.consumptionRate;
      console.log(consumptionKwh);

      const categoryConsumption = consumptionKwh * 1.5;

      const consumptionRateKWH = consumptionKwh;
      const consumptionRateRupees = categoryConsumption;

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

const getBusinessConsumptionDataPerMin = asyncHandler(async (req, res) => {
  try {
    const businessId = req.params.businessId;
    if (!businessId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Business ID is required"));
    }

    const { fuelType } = req.body;
    let assetDetails;
    let query = { businessId: businessId };

    if (fuelType) {
      query.fuelType = fuelType;
    }

    assetDetails = await Asset.find(query).populate({
      path: "usageHistory.usageHistoryId",
      model: "UsageHistory",
    });

    let usageHistories = assetDetails.flatMap((asset) =>
      asset.usageHistory.map((history) => history.usageHistoryId)
    );

    const aggregatedMinuteConsumption = {};
    for (const usageHistory of usageHistories) {
      const assetId = usageHistory.assetID;
      const asset = await Asset.findById(assetId);
      const consumptionRateKWH = asset.consumptionRate;
      const consumptionRateRupees = consumptionRateKWH * 1.5;

      const minuteConsumption = {};
      let onTime = null;

      usageHistory.stateDetails.forEach((detail, index) => {
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
        if (index === usageHistory.stateDetails.length - 1 && onTime) {
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

      for (const minute in minuteConsumption) {
        if (!aggregatedMinuteConsumption[minute]) {
          aggregatedMinuteConsumption[minute] = { kWh: 0, rupees: 0 };
        }
        aggregatedMinuteConsumption[minute].kWh +=
          minuteConsumption[minute].kWh;
        aggregatedMinuteConsumption[minute].rupees +=
          minuteConsumption[minute].rupees;
      }
    }
    const sortedKeys = Object.keys(aggregatedMinuteConsumption).sort();
    const filledMinuteConsumption = {};

    let currentTime = moment(sortedKeys[0]);
    const endTime = moment(sortedKeys[sortedKeys.length - 1]);

    while (currentTime <= endTime) {
      const timeString = currentTime.format("YYYY-MM-DD HH:mm");
      filledMinuteConsumption[timeString] = aggregatedMinuteConsumption[
        timeString
      ] || {
        kWh: 0,
        rupees: 0,
      };
      currentTime.add(1, "minute");
    }

    // Round the consumption values
    for (const time in filledMinuteConsumption) {
      filledMinuteConsumption[time].kWh =
        Math.round(filledMinuteConsumption[time].kWh * 100) / 100;
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
});

const getBusinessConsumptionDataPerHour = asyncHandler(async (req, res) => {
  try {
    const businessId = req.params.businessId;
    if (!businessId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Business ID is required"));
    }

    const { fuelType } = req.body;
    let assetDetails;
    let query = { businessId: businessId };

    if (fuelType) {
      query.fuelType = fuelType;
    }

    assetDetails = await Asset.find(query).populate({
      path: "usageHistory.usageHistoryId",
      model: "UsageHistory",
    });

    let usageHistories = assetDetails.flatMap((asset) =>
      asset.usageHistory.map((history) => history.usageHistoryId)
    );

    const aggregatedHourConsumption = {};

    for (const usageHistory of usageHistories) {
      const assetId = usageHistory.assetID;
      const asset = await Asset.findById(assetId);
      const consumptionRateKWH = asset.consumptionRate;
      const consumptionRateRupees = consumptionRateKWH * 1.5;

      const hourlyConsumption = {};
      let onTime = null;

      usageHistory.stateDetails.forEach((detail, index) => {
        const time = moment(detail.time).tz("Asia/Kolkata");
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
        if (index === usageHistory.stateDetails.length - 1 && onTime) {
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

      // Aggregate each asset's hourly consumption into the overall business consumption
      for (const hour in hourlyConsumption) {
        if (!aggregatedHourConsumption[hour]) {
          aggregatedHourConsumption[hour] = { kWh: 0, rupees: 0 };
        }
        aggregatedHourConsumption[hour].kWh += hourlyConsumption[hour].kWh;
        aggregatedHourConsumption[hour].rupees +=
          hourlyConsumption[hour].rupees;
      }
    }

    // Round the consumption values
    for (const hour in aggregatedHourConsumption) {
      aggregatedHourConsumption[hour].kWh =
        Math.round(aggregatedHourConsumption[hour].kWh * 100) / 100;
      aggregatedHourConsumption[hour].rupees = Math.round(
        aggregatedHourConsumption[hour].rupees
      );
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          aggregatedHourConsumption,
          "Per-hour consumption data retrieved successfully"
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

const getBusinessConsumptionDataLast7Days = asyncHandler(async (req, res) => {
  try {
    const businessId = req.params.businessId;
    if (!businessId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Business ID is required"));
    }

    const businessConsumption = {};
    const { fuelType } = req.body;
    let assetDetails;
    let query = { businessId: businessId };

    if (fuelType) {
      query.fuelType = fuelType;
    }

    // Calculate the date range for the last 7 days including today
    const endDate = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");
    const startDate = moment()
      .subtract(6, "days")
      .tz("Asia/Kolkata")
      .format("YYYY-MM-DD");

    console.log(startDate);
    console.log(endDate);

    assetDetails = await Asset.find(query).populate({
      path: "usageHistory.usageHistoryId",
      model: "UsageHistory",
    });

    let usageHistories = assetDetails.flatMap((asset) =>
      asset.usageHistory.map((history) => history.usageHistoryId)
    );

    for (const usageHistory of usageHistories) {
      const assetId = usageHistory.assetID;
      const asset = await Asset.findById(assetId);

      const consumptionKwh = asset.consumptionRate;
      const categoryConsumption = consumptionKwh * 1.5;

      const consumptionRateKWH = consumptionKwh;
      const consumptionRateRupees = categoryConsumption;

      let onTime = null;

      usageHistory.stateDetails.forEach((detail, index) => {
        const date = moment(detail.time)
          .tz("Asia/Kolkata")
          .format("YYYY-MM-DD");
        const time = moment(detail.time).tz("Asia/Kolkata");

        // Skip processing if the date is outside the last 7 days range
        if (date < startDate || date > endDate) {
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

    console.log(businessConsumption);

    // Calculate cumulative consumption for the last 7 days
    let cumulativeConsumption = { kWh: 0, rupees: 0 };
    for (const date in businessConsumption) {
      cumulativeConsumption.kWh += businessConsumption[date].kWh;
      cumulativeConsumption.rupees += businessConsumption[date].rupees;
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          cumulativeConsumption,
          "Cumulative consumption data for the last 7 days retrieved successfully"
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
          "An error occurred while calculating cumulative consumption data"
        )
      );
  }
});

const getBusinessConsumptionDataLast15Days = asyncHandler(async (req, res) => {
  try {
    const businessId = req.params.businessId;
    if (!businessId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Business ID is required"));
    }

    const businessConsumption = {};
    const { fuelType } = req.body;
    let assetDetails;
    let query = { businessId: businessId };

    if (fuelType) {
      query.fuelType = fuelType;
    }

    // Calculate the date range for the last 7 days including today
    const endDate = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");
    const startDate = moment()
      .subtract(14, "days")
      .tz("Asia/Kolkata")
      .format("YYYY-MM-DD");

    console.log(`Start Date: ${startDate}`);
    console.log(`End Date: ${endDate}`);

    assetDetails = await Asset.find(query).populate({
      path: "usageHistory.usageHistoryId",
      model: "UsageHistory",
    });

    let usageHistories = assetDetails.flatMap((asset) =>
      asset.usageHistory.map((history) => history.usageHistoryId)
    );

    for (const usageHistory of usageHistories) {
      const assetId = usageHistory.assetID;
      const asset = await Asset.findById(assetId);

      const consumptionKwh = asset.consumptionRate;
      const categoryConsumption = consumptionKwh * 1.5;

      const consumptionRateKWH = consumptionKwh;
      const consumptionRateRupees = categoryConsumption;

      let onTime = null;

      usageHistory.stateDetails.forEach((detail, index) => {
        const date = moment(detail.time)
          .tz("Asia/Kolkata")
          .format("YYYY-MM-DD");
        const time = moment(detail.time).tz("Asia/Kolkata");

        // Skip processing if the date is outside the last 7 days range
        if (date < startDate || date > endDate) {
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

    console.log(businessConsumption);

    // Calculate cumulative consumption for the last 7 days
    let cumulativeConsumption = { kWh: 0, rupees: 0 };
    for (const date in businessConsumption) {
      cumulativeConsumption.kWh += businessConsumption[date].kWh;
      cumulativeConsumption.rupees += businessConsumption[date].rupees;
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          cumulativeConsumption,
          "Cumulative consumption data for the last 15 days retrieved successfully"
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
          "An error occurred while calculating cumulative consumption data"
        )
      );
  }
});

const getBusinessConsumptionLastnDays = asyncHandler(async (req, res) => {
  try {
    const { businessId, nthDays } = req.params;
    if (!businessId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Business ID is required"));
    }

    const businessConsumption = {};
    const { fuelType } = req.body;
    let assetDetails;
    let query = { businessId: businessId };

    if (fuelType) {
      query.fuelType = fuelType;
    }

    // Calculate the date range for the last 7 days including today
    const endDate = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");
    const startDate = moment()
      .subtract(nthDays, "days")
      .tz("Asia/Kolkata")
      .format("YYYY-MM-DD");

    console.log(`Start Date: ${startDate}`);
    console.log(`End Date: ${endDate}`);

    assetDetails = await Asset.find(query).populate({
      path: "usageHistory.usageHistoryId",
      model: "UsageHistory",
    });

    let usageHistories = assetDetails.flatMap((asset) =>
      asset.usageHistory.map((history) => history.usageHistoryId)
    );

    for (const usageHistory of usageHistories) {
      const assetId = usageHistory.assetID;
      const asset = await Asset.findById(assetId);

      const consumptionKwh = asset.consumptionRate;
      const categoryConsumption = consumptionKwh * 1.5;

      const consumptionRateKWH = consumptionKwh;
      const consumptionRateRupees = categoryConsumption;

      let onTime = null;

      usageHistory.stateDetails.forEach((detail, index) => {
        const date = moment(detail.time)
          .tz("Asia/Kolkata")
          .format("YYYY-MM-DD");
        const time = moment(detail.time).tz("Asia/Kolkata");

        // Skip processing if the date is outside the last 7 days range
        if (date < startDate || date > endDate) {
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

    console.log(businessConsumption);

    // Calculate cumulative consumption for the last 7 days
    let cumulativeConsumption = { kWh: 0, rupees: 0 };
    for (const date in businessConsumption) {
      cumulativeConsumption.kWh += businessConsumption[date].kWh;
      cumulativeConsumption.rupees += businessConsumption[date].rupees;
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          cumulativeConsumption,
          `Cumulative consumption data for the last ${nthDays} days retrieved successfully`
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
          "An error occurred while calculating cumulative consumption data"
        )
      );
  }
});

const getBusinessConsumptionDataSpecificDay = asyncHandler(async (req, res) => {
  try {
    const businessId = req.params.businessId;
    if (!businessId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Business ID is required"));
    }

    const specificDate = req.query.date; // Expecting "yyyy/mm/dd" format
    const formattedDate = specificDate
      ? moment(specificDate, "YYYY/MM/DD").format("YYYY-MM-DD")
      : null;

    const businessConsumption = {};
    const { fuelType } = req.body;
    let assetDetails;
    let query = { businessId: businessId };

    if (fuelType) {
      query.fuelType = fuelType;
    }

    assetDetails = await Asset.find(query).populate({
      path: "usageHistory.usageHistoryId",
      model: "UsageHistory",
    });

    let usageHistories = assetDetails.flatMap((asset) =>
      asset.usageHistory.map((history) => history.usageHistoryId)
    );

    for (const usageHistory of usageHistories) {
      const assetId = usageHistory.assetID;
      const asset = await Asset.findById(assetId);

      const targetCategory = asset.fuelType;
      const consumptionKwh = asset.consumptionRate;
      const categoryConsumption = consumptionKwh * 1.5;

      const consumptionRateKWH = consumptionKwh;
      const consumptionRateRupees = categoryConsumption;

      let onTime = null;

      usageHistory.stateDetails.forEach((detail, index) => {
        const date = moment(detail.time)
          .tz("Asia/Kolkata")
          .format("YYYY-MM-DD");
        const time = moment(detail.time).tz("Asia/Kolkata");

        if (formattedDate && date !== formattedDate) {
          // Skip processing if we're looking for a specific date and it's not matching
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

    console.log(businessConsumption);

    // Round the consumption values
    for (const date in businessConsumption) {
      businessConsumption[date].kWh =
        Math.round(businessConsumption[date].kWh * 100) / 100; // Round to 2 decimal places
      businessConsumption[date].rupees = Math.round(
        businessConsumption[date].rupees
      );
    }

    // If a specific date was requested, filter the result
    let response = businessConsumption;
    if (formattedDate) {
      response = businessConsumption[formattedDate] || { kWh: 0, rupees: 0 };
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          response,
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

export {
  getBusinessConsumptionDataPerDay,
  getBusinessConsumptionDataPerMin,
  getBusinessConsumptionDataPerHour,
  getBusinessConsumptionDataLast7Days,
  getBusinessConsumptionDataSpecificDay,
  getBusinessConsumptionDataLast15Days,
  getBusinessConsumptionLastnDays,
};
