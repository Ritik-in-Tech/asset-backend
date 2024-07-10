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
    } else if (equipmentType) {
      query.equipmentType = equipmentType;
    } else if (officeId) {
      query.officeId = officeId;
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
