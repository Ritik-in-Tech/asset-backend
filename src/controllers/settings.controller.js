import { Asset } from "../models/asset.model.js";
import { Business } from "../models/business.model.js";
import { Settings } from "../models/settings.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const addSettingsData = asyncHandler(async (req, res) => {
  try {
    const assetId = req.params.assetId;
    if (!assetId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Please provide assetId in params"));
    }

    const asset = await Asset.findById(assetId);
    if (!asset) {
      return res.status(400).json(new ApiResponse(400, {}, "Asset not found"));
    }

    const { category, consumptionRate } = req.body;

    // Check if settings for the businessId already exist
    let settings = await Settings.findOne({ assetId: assetId });

    if (!settings) {
      // If settings don't exist, create a new one
      settings = new Settings({
        assetId: assetId,
        consumption: [],
      });
    }

    if (category && consumptionRate) {
      const existingConsumption = settings.consumption.find(
        (item) => item.category === category
      );

      if (existingConsumption) {
        existingConsumption.consumptionRate = consumptionRate;
      } else {
        settings.consumption.push({
          category: category,
          consumptionRate: consumptionRate,
        });
      }
    }

    await settings.save();

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
