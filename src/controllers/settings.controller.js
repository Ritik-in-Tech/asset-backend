import { Business } from "../models/business.model.js";
import { Settings } from "../models/settings.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const addSettingsData = asyncHandler(async (req, res) => {
  try {
    const businessId = req.params.businessId;
    if (!businessId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Please provide businessId in params"));
    }

    const business = await Business.findById(businessId);
    if (!business) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Business not found"));
    }

    const { consumptionType, consumptionRate, equipmentType, equipmentRate } =
      req.body;

    if (consumptionType) {
      const checkExistConsumptionInBusiness = business.businessCategory.some(
        (category) => category.name === consumptionType
      );

      if (!checkExistConsumptionInBusiness) {
        return res
          .status(400)
          .json(
            new ApiResponse(
              400,
              {},
              "Consumption type not found in the business"
            )
          );
      }
    }

    if (equipmentType) {
      const checkExistEquipmentInBusiness = business.assetCategory.some(
        (category) => category.name === equipmentType
      );

      if (!checkExistEquipmentInBusiness) {
        return res
          .status(400)
          .json(
            new ApiResponse(400, {}, "Equipment type not found in the business")
          );
      }
    }

    // Check if settings for the businessId already exist
    let settings = await Settings.findOne({ businessId: businessId });

    if (!settings) {
      // If settings don't exist, create a new one
      settings = new Settings({
        businessId: businessId,
        consumption: [],
        equipment: [],
      });
    }

    // Update or add consumption entry
    if (consumptionType && consumptionRate) {
      const existingConsumption = settings.consumption.find(
        (item) => item.consumptionType === consumptionType
      );

      if (existingConsumption) {
        // Update the rate of the existing consumption type
        existingConsumption.consumptionRate = consumptionRate;
      } else {
        // Add new consumption entry
        settings.consumption.push({
          consumptionType: consumptionType,
          consumptionRate: consumptionRate,
        });
      }
    }

    // Update or add equipment entry
    if (equipmentType && equipmentRate) {
      const existingEquipment = settings.equipment.find(
        (item) => item.equipmentType === equipmentType
      );

      if (existingEquipment) {
        // Update the rate of the existing equipment type
        existingEquipment.equipmentRate = equipmentRate;
      } else {
        // Add new equipment entry
        settings.equipment.push({
          equipmentType: equipmentType,
          equipmentRate: equipmentRate,
        });
      }
    }

    console.log("Settings before saving:", settings);
    await settings.save();
    console.log("Settings after saving:", settings);

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { settings },
          "Settings created/updated successfully!"
        )
      );
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(new ApiResponse(500, { error }, "Internal server error"));
  }
});

export { addSettingsData };
