import { Asset } from "../../models/asset.model.js";
import moment from "moment-timezone";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { Office } from "../../models/office.model.js";
const timeZone = "Asia/Kolkata";

const getBusinessConsumptionDataToday = asyncHandler(async (req, res) => {
  try {
    const businessId = req.params.businessId;
    if (!businessId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Business ID is required"));
    }

    const { fuelType, equipmentType, officeId } = req.body;
    let assetDetails;
    let query = { businessId: businessId };

    if (fuelType) {
      query.fuelType = fuelType;
      assetDetails = await Asset.find(query).populate({
        path: "usageHistory.usageHistoryId",
        model: "UsageHistory",
      });
    } else if (equipmentType) {
      query.equipmentType = equipmentType;
      assetDetails = await Asset.find(query).populate({
        path: "usageHistory.usageHistoryId",
        model: "UsageHistory",
      });
    } else if (officeId) {
      const office = await Office.findById(officeId);

      if (!office) {
        return res
          .status(400)
          .json(new ApiResponse(400, {}, "Office not found"));
      }

      const assetIds = office.assets.map((asset) => asset.assetId);

      assetDetails = await Asset.find({
        businessId: businessId,
        _id: { $in: assetIds },
      }).populate({
        path: "usageHistory.usageHistoryId",
        model: "UsageHistory",
      });
    } else {
      assetDetails = await Asset.find(query).populate({
        path: "usageHistory.usageHistoryId",
        model: "UsageHistory",
      });
    }

    console.log(assetDetails);

    // console.log(assetDetails);

    let usageHistories = assetDetails.flatMap((asset) =>
      asset.usageHistory.map((history) => history.usageHistoryId)
    );

    console.log(usageHistories);

    const startOfDay = moment().tz("Asia/Kolkata").startOf("day");
    const endOfDay = moment().tz("Asia/Kolkata").endOf("day");
    const currentTime = moment().tz("Asia/Kolkata");
    console.log(startOfDay);
    console.log(endOfDay);
    console.log(currentTime);

    const totalConsumptionMap = new Map();

    for (const usageHistory of usageHistories) {
      const businessConsumption = {};
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

      const todayStateDetails = usageHistory.stateDetails.filter((detail) =>
        moment(detail.time).tz("Asia/Kolkata").isBetween(startOfDay, endOfDay)
      );
      todayStateDetails.forEach((detail, index) => {
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

      totalConsumptionMap.set(asset.name, businessConsumption);
    }

    console.log(totalConsumptionMap);

    let totalKWh = 0;
    let totalRupees = 0;

    for (const [appliance, dateData] of totalConsumptionMap) {
      for (const [date, usage] of Object.entries(dateData)) {
        totalKWh += usage.kWh;
        totalRupees += usage.rupees;
      }
    }

    totalKWh = Math.floor(totalKWh);
    totalRupees = Math.floor(totalRupees);

    if (officeId) {
      const office = await Office.findById(officeId);

      console.log(office);

      office.totalConsumptionKwh += totalKWh;
      office.totalConsumptionRupees += totalRupees;

      await office.save();
    }

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { totalKWh, totalRupees },
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

const getBusinessConsumptionDataTodayPerMin = asyncHandler(async (req, res) => {
  try {
    const businessId = req.params.businessId;
    if (!businessId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Business ID is required"));
    }

    const { fuelType, equipmentType } = req.body;
    let assetDetails;
    let query = { businessId: businessId };

    if (fuelType) {
      query.fuelType = fuelType;
    } else if (equipmentType) {
      query.equipmentType = equipmentType;
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

const getBusinessConsumptionLastNHours = asyncHandler(async (req, res) => {
  try {
    const businessId = req.params.businessId;
    let hours = req.params.hours;
    if (!businessId || !hours) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Business ID and hours are required "));
    }
    hours = parseInt(hours);
    const minutes = hours * 60;

    const { fuelType, equipmentType, officeId } = req.body;
    let assetDetails;
    let query = { businessId: businessId };

    if (fuelType) {
      query.fuelType = fuelType;
      assetDetails = await Asset.find(query).populate({
        path: "usageHistory.usageHistoryId",
        model: "UsageHistory",
      });
    } else if (equipmentType) {
      query.equipmentType = equipmentType;
      assetDetails = await Asset.find(query).populate({
        path: "usageHistory.usageHistoryId",
        model: "UsageHistory",
      });
    } else if (officeId) {
      const office = await Office.findById(officeId);

      if (!office) {
        return res
          .status(400)
          .json(new ApiResponse(400, {}, "Office not found"));
      }

      const assetIds = office.assets.map((asset) => asset.assetId);

      assetDetails = await Asset.find({
        businessId: businessId,
        _id: { $in: assetIds },
      }).populate({
        path: "usageHistory.usageHistoryId",
        model: "UsageHistory",
      });
    } else {
      assetDetails = await Asset.find(query).populate({
        path: "usageHistory.usageHistoryId",
        model: "UsageHistory",
      });
    }

    console.log(assetDetails);

    let usageHistories = assetDetails.flatMap((asset) =>
      asset.usageHistory.map((history) => history.usageHistoryId)
    );
    const endTime = moment().tz("Asia/Kolkata");
    const startTime = endTime.clone().subtract(minutes, "minutes");

    // console.log(usageHistories);

    const ConsumptionMapLastNHour = new Map();
    for (const usageHistory of usageHistories) {
      const assetId = usageHistory.assetID;
      const asset = await Asset.findById(assetId);
      const consumptionRateKWH = asset.consumptionRate;
      const consumptionRateRupees = consumptionRateKWH * 1.5;

      const minutelyConsumption = [];

      const relevantStateDetails = usageHistory.stateDetails.filter((detail) =>
        moment(detail.time)
          .tz("Asia/Kolkata")
          .isBetween(startTime, endTime, null, "[]")
      );

      console.log(relevantStateDetails);

      let onTime = null;
      let currentMinute = startTime.clone();

      while (currentMinute.isSameOrBefore(endTime)) {
        const minuteKey = currentMinute.format("HH:mm");
        const consumptionData = { minute: minuteKey, kWh: 0, rupees: 0 };

        relevantStateDetails.forEach((detail, index) => {
          const detailTime = moment(detail.time).tz("Asia/Kolkata");

          if (detailTime.isSameOrBefore(currentMinute)) {
            if (detail.state === "On") {
              onTime = detailTime;
            } else if (detail.state === "Off") {
              onTime = null;
            }
          }

          if (
            onTime &&
            index === relevantStateDetails.length - 1 &&
            detail.state === "On"
          ) {
            const consumptionEnd = moment.min(
              currentMinute.clone().add(1, "minute"),
              endTime
            );
            const durationHours = moment
              .duration(consumptionEnd.diff(currentMinute))
              .asHours();
            consumptionData.kWh = durationHours * consumptionRateKWH;
            consumptionData.rupees = durationHours * consumptionRateRupees;
          }
        });

        if (onTime && onTime.isBefore(currentMinute)) {
          const consumptionEnd = moment.min(
            currentMinute.clone().add(1, "minute"),
            endTime
          );
          const durationHours = moment
            .duration(consumptionEnd.diff(currentMinute))
            .asHours();
          consumptionData.kWh = durationHours * consumptionRateKWH;
          consumptionData.rupees = durationHours * consumptionRateRupees;
        }

        consumptionData.kWh = Math.round(consumptionData.kWh * 1000) / 1000; // Round to 3 decimal places
        consumptionData.rupees = Math.round(consumptionData.rupees * 100) / 100; // Round to 2 decimal places

        minutelyConsumption.push(consumptionData);
        currentMinute.add(1, "minute");
      }

      ConsumptionMapLastNHour.set(asset.name, minutelyConsumption);
    }

    // console.log(ConsumptionMapLastNHour);

    const ConsumptionMapObject = Object.fromEntries(ConsumptionMapLastNHour);
    console.log(ConsumptionMapObject);

    const aggregatedData = {};

    Object.values(ConsumptionMapObject).forEach((assetData) => {
      assetData.forEach((minuteData) => {
        const { minute, kWh, rupees } = minuteData;
        if (!aggregatedData[minute]) {
          aggregatedData[minute] = { minute, kWh: 0, rupees: 0 };
        }
        aggregatedData[minute].kWh += kWh;
        aggregatedData[minute].rupees += rupees;
      });
    });

    // console.log(aggregatedData);

    const result = Object.values(aggregatedData).map((item) => ({
      minute: item.minute,
      kWh: Math.round(item.kWh * 1000) / 1000, // Round to 3 decimal places
      rupees: Math.round(item.rupees * 100) / 100, // Round to 2 decimal places
    }));

    result.sort((a, b) => a.minute.localeCompare(b.minute));

    return res
      .status(200)
      .json(new ApiResponse(200, result, "Consumption fetched successfully"));
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(new ApiResponse(500, { error }, "Internal server error"));
  }
});

const getBusinessConsumptionDataTodayPerHour = asyncHandler(
  async (req, res) => {
    try {
      const businessId = req.params.businessId;
      if (!businessId) {
        return res
          .status(400)
          .json(new ApiResponse(400, {}, "Business ID is required"));
      }

      const { fuelType, equipmentType, officeId } = req.body;
      let assetDetails;
      let query = { businessId: businessId };

      if (fuelType) {
        query.fuelType = fuelType;
        assetDetails = await Asset.find(query).populate({
          path: "usageHistory.usageHistoryId",
          model: "UsageHistory",
        });
      } else if (equipmentType) {
        query.equipmentType = equipmentType;
        assetDetails = await Asset.find(query).populate({
          path: "usageHistory.usageHistoryId",
          model: "UsageHistory",
        });
      } else if (officeId) {
        const office = await Office.findById(officeId);

        if (!office) {
          return res
            .status(400)
            .json(new ApiResponse(400, {}, "Office not found"));
        }

        const assetIds = office.assets.map((asset) => asset.assetId);

        assetDetails = await Asset.find({
          businessId: businessId,
          _id: { $in: assetIds },
        }).populate({
          path: "usageHistory.usageHistoryId",
          model: "UsageHistory",
        });
      } else {
        assetDetails = await Asset.find(query).populate({
          path: "usageHistory.usageHistoryId",
          model: "UsageHistory",
        });
      }

      console.log(assetDetails);

      let usageHistories = assetDetails.flatMap((asset) =>
        asset.usageHistory.map((history) => history.usageHistoryId)
      );

      // console.log(usageHistories);

      const ConsumptionMapPerHour = new Map();

      for (const usageHistory of usageHistories) {
        const assetId = usageHistory.assetID;
        const asset = await Asset.findById(assetId);
        const startOfDay = moment().tz("Asia/Kolkata").startOf("day");
        const endOfDay = moment().tz("Asia/Kolkata").endOf("day");
        const currentTime = moment().tz("Asia/Kolkata");

        const consumptionRateKWH = asset.consumptionRate;
        const consumptionRateRupees = consumptionRateKWH * 1.5;

        const hourlyConsumption = {};

        const todayStateDetails = usageHistory.stateDetails.filter((detail) =>
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
        // let currentHour;
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

            hourlyConsumption[hourKey].kWh +=
              durationHours * consumptionRateKWH;
            hourlyConsumption[hourKey].rupees +=
              durationHours * consumptionRateRupees;

            currentHour = nextHour;
          }
        }
        ConsumptionMapPerHour.set(asset.name, hourlyConsumption);
      }

      // console.log(ConsumptionMapPerHour);

      const combinedData = new Map();

      ConsumptionMapPerHour.forEach((assetData) => {
        Object.entries(assetData).forEach(([hour, data]) => {
          if (!combinedData.has(hour)) {
            combinedData.set(hour, { kWh: 0, rupees: 0 });
          }
          const current = combinedData.get(hour);
          current.kWh += data.kWh;
          current.kWh = Math.floor(current.kWh);
          current.rupees += data.rupees;
          current.rupees = Math.floor(current.rupees);
        });
      });

      const PerHourConsumption = Object.fromEntries(combinedData);

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { PerHourConsumption },
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
  }
);

const getBusinessConsumptionLastnDays = asyncHandler(async (req, res) => {
  try {
    const { businessId, nthDays } = req.params;
    if (!businessId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Business ID is required"));
    }

    const { fuelType, equipmentType, officeId } = req.body;
    let assetDetails;
    let query = { businessId: businessId };

    if (fuelType) {
      query.fuelType = fuelType;
      assetDetails = await Asset.find(query).populate({
        path: "usageHistory.usageHistoryId",
        model: "UsageHistory",
      });
    } else if (equipmentType) {
      query.equipmentType = equipmentType;
      assetDetails = await Asset.find(query).populate({
        path: "usageHistory.usageHistoryId",
        model: "UsageHistory",
      });
    } else if (officeId) {
      const office = await Office.findById(officeId);

      if (!office) {
        return res
          .status(400)
          .json(new ApiResponse(400, {}, "Office not found"));
      }

      const assetIds = office.assets.map((asset) => asset.assetId);

      assetDetails = await Asset.find({
        businessId: businessId,
        _id: { $in: assetIds },
      }).populate({
        path: "usageHistory.usageHistoryId",
        model: "UsageHistory",
      });
    } else {
      assetDetails = await Asset.find(query).populate({
        path: "usageHistory.usageHistoryId",
        model: "UsageHistory",
      });
    }

    console.log(assetDetails);

    // Calculate the date range for the last n days including today
    const endDate = moment().tz("Asia/Kolkata").endOf("day");
    const startDate = moment()
      .tz("Asia/Kolkata")
      .startOf("day")
      .subtract(nthDays - 1, "days");

    const dateArray = [];
    let currentDate = startDate.clone();

    while (currentDate <= endDate) {
      dateArray.push(currentDate.format("YYYY-MM-DD"));
      currentDate.add(1, "days");
    }

    // console.log(endDate.format("YYYY-MM-DD HH:mm:ss"));
    // console.log(dateArray);

    let usageHistories = assetDetails.flatMap((asset) =>
      asset.usageHistory.map((history) => history.usageHistoryId)
    );

    const LastNDaysMap = new Map();

    for (const formattedDate of dateArray) {
      const startOfDay = moment(formattedDate)
        .tz("Asia/Kolkata")
        .startOf("day");
      const endOfDay = moment(formattedDate).tz("Asia/Kolkata").endOf("day");
      const currentTime = moment().tz("Asia/Kolkata");
      console.log(startOfDay);
      console.log(endOfDay);
      console.log(currentTime);

      const totalConsumptionMap = new Map();

      for (const usageHistory of usageHistories) {
        const businessConsumption = {};
        const assetId = usageHistory.assetID;
        const asset = await Asset.findById(assetId);
        const consumptionKwh = asset.consumptionRate;
        const categoryConsumption = consumptionKwh * 1.5;

        const consumptionRateKWH = consumptionKwh;
        const consumptionRateRupees = categoryConsumption;

        let onTime = null;
        const todayStateDetails = usageHistory.stateDetails.filter((detail) =>
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
        totalConsumptionMap.set(asset.name, businessConsumption);
      }

      console.log(totalConsumptionMap);
      let totalKWh = 0;
      let totalRupees = 0;

      for (const [appliance, dateData] of totalConsumptionMap) {
        for (const [date, usage] of Object.entries(dateData)) {
          totalKWh += usage.kWh;
          totalRupees += usage.rupees;
        }
      }

      totalKWh = Math.floor(totalKWh);
      totalRupees = Math.floor(totalRupees);

      LastNDaysMap.set(formattedDate, { totalKWh, totalRupees });
    }

    console.log(LastNDaysMap);
    const LastNDaysObject = Object.fromEntries(LastNDaysMap);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { LastNDaysData: LastNDaysObject },
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

const getBusinessConsumptionMTD = asyncHandler(async (req, res) => {
  try {
    const { businessId } = req.params;
    if (!businessId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Business Id is not provided"));
    }

    const { fuelType, equipmentType, officeId } = req.body;
    let assetDetails;
    let query = { businessId: businessId };

    if (fuelType) {
      query.fuelType = fuelType;
      assetDetails = await Asset.find(query).populate({
        path: "usageHistory.usageHistoryId",
        model: "UsageHistory",
      });
    } else if (equipmentType) {
      query.equipmentType = equipmentType;
      assetDetails = await Asset.find(query).populate({
        path: "usageHistory.usageHistoryId",
        model: "UsageHistory",
      });
    } else if (officeId) {
      const office = await Office.findById(officeId);

      if (!office) {
        return res
          .status(400)
          .json(new ApiResponse(400, {}, "Office not found"));
      }

      const assetIds = office.assets.map((asset) => asset.assetId);

      assetDetails = await Asset.find({
        businessId: businessId,
        _id: { $in: assetIds },
      }).populate({
        path: "usageHistory.usageHistoryId",
        model: "UsageHistory",
      });
    } else {
      assetDetails = await Asset.find(query).populate({
        path: "usageHistory.usageHistoryId",
        model: "UsageHistory",
      });
    }

    console.log(assetDetails);

    const startDate = moment().tz(timeZone).startOf("month");
    const endDate = moment().tz(timeZone).endOf("day");
    console.log(startDate);
    console.log(endDate);
    const dateArray = [];
    let currentDate = startDate.clone();

    while (currentDate <= endDate) {
      dateArray.push(currentDate.format("YYYY-MM-DD"));
      currentDate.add(1, "day");
    }

    console.log(dateArray);

    let usageHistories = assetDetails.flatMap((asset) =>
      asset.usageHistory.map((history) => history.usageHistoryId)
    );

    const LastNDaysMap = new Map();

    for (const formattedDate of dateArray) {
      const startOfDay = moment(formattedDate)
        .tz("Asia/Kolkata")
        .startOf("day");
      const endOfDay = moment(formattedDate).tz("Asia/Kolkata").endOf("day");
      const currentTime = moment().tz("Asia/Kolkata");
      console.log(startOfDay);
      console.log(endOfDay);
      console.log(currentTime);

      const totalConsumptionMap = new Map();

      for (const usageHistory of usageHistories) {
        const businessConsumption = {};
        const assetId = usageHistory.assetID;
        const asset = await Asset.findById(assetId);
        const consumptionKwh = asset.consumptionRate;
        const categoryConsumption = consumptionKwh * 1.5;

        const consumptionRateKWH = consumptionKwh;
        const consumptionRateRupees = categoryConsumption;

        let onTime = null;
        const todayStateDetails = usageHistory.stateDetails.filter((detail) =>
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
        totalConsumptionMap.set(asset.name, businessConsumption);
      }

      console.log(totalConsumptionMap);
      let totalKWh = 0;
      let totalRupees = 0;

      for (const [appliance, dateData] of totalConsumptionMap) {
        for (const [date, usage] of Object.entries(dateData)) {
          totalKWh += usage.kWh;
          totalRupees += usage.rupees;
        }
      }

      totalKWh = Math.floor(totalKWh);
      totalRupees = Math.floor(totalRupees);

      LastNDaysMap.set(formattedDate, { totalKWh, totalRupees });
    }

    console.log(LastNDaysMap);
    const LastNDaysObject = Object.fromEntries(LastNDaysMap);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { MTD: LastNDaysObject },
          `Cumulative consumption data for days retrieved successfully`
        )
      );
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(new ApiResponse(500, { error }, "Internal server error"));
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

    const specificDate = req.query.date;
    const formattedDate = specificDate
      ? moment(specificDate, "YYYY/MM/DD").format("YYYY-MM-DD")
      : null;

    console.log("Hello");
    console.log(typeof formattedDate);

    const { fuelType, equipmentType, officeId } = req.body;
    let assetDetails;
    let query = { businessId: businessId };

    if (fuelType) {
      query.fuelType = fuelType;
      assetDetails = await Asset.find(query).populate({
        path: "usageHistory.usageHistoryId",
        model: "UsageHistory",
      });
    } else if (equipmentType) {
      query.equipmentType = equipmentType;
      assetDetails = await Asset.find(query).populate({
        path: "usageHistory.usageHistoryId",
        model: "UsageHistory",
      });
    } else if (officeId) {
      const office = await Office.findById(officeId);

      if (!office) {
        return res
          .status(400)
          .json(new ApiResponse(400, {}, "Office not found"));
      }

      const assetIds = office.assets.map((asset) => asset.assetId);

      assetDetails = await Asset.find({
        businessId: businessId,
        _id: { $in: assetIds },
      }).populate({
        path: "usageHistory.usageHistoryId",
        model: "UsageHistory",
      });
    } else {
      assetDetails = await Asset.find(query).populate({
        path: "usageHistory.usageHistoryId",
        model: "UsageHistory",
      });
    }

    console.log(assetDetails);

    let usageHistories = assetDetails.flatMap((asset) =>
      asset.usageHistory.map((history) => history.usageHistoryId)
    );

    const startOfDay = moment(formattedDate).tz("Asia/Kolkata").startOf("day");
    const endOfDay = moment(formattedDate).tz("Asia/Kolkata").endOf("day");
    const currentTime = moment().tz("Asia/Kolkata");
    console.log(startOfDay);
    console.log(endOfDay);
    console.log(currentTime);

    const totalConsumptionMap = new Map();

    for (const usageHistory of usageHistories) {
      const businessConsumption = {};
      const assetId = usageHistory.assetID;
      const asset = await Asset.findById(assetId);
      const consumptionKwh = asset.consumptionRate;
      const categoryConsumption = consumptionKwh * 1.5;

      const consumptionRateKWH = consumptionKwh;
      const consumptionRateRupees = categoryConsumption;

      let onTime = null;
      const todayStateDetails = usageHistory.stateDetails.filter((detail) =>
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
      totalConsumptionMap.set(asset.name, businessConsumption);
    }

    console.log(totalConsumptionMap);
    let totalKWh = 0;
    let totalRupees = 0;

    for (const [appliance, dateData] of totalConsumptionMap) {
      for (const [date, usage] of Object.entries(dateData)) {
        totalKWh += usage.kWh;
        totalRupees += usage.rupees;
      }
    }

    totalKWh = Math.floor(totalKWh);
    totalRupees = Math.floor(totalRupees);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { totalKWh, totalRupees },
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
  getBusinessConsumptionDataToday,
  getBusinessConsumptionDataTodayPerHour,
  getBusinessConsumptionDataTodayPerMin,
  getBusinessConsumptionDataSpecificDay,
  getBusinessConsumptionLastnDays,
  getBusinessConsumptionLastNHours,
  getBusinessConsumptionMTD,
};
