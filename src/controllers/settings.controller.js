import { Business } from "../models/business.model.js";
import { Settings } from "../models/settings.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { BusinessUsers } from "../models/businessusers.model.js";

const addSettingsBusinessData = asyncHandler(async (req, res) => {
  try {
    const businessId = req.params.businessId;
    if (!businessId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Business Id is not provided"));
    }

    const business = await Business.findById(businessId);
    if (!business) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Business not found"));
    }

    const userId = req.user._id;
    if (!userId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Please log in again"));
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json(new ApiResponse(400, {}, "User not found"));
    }

    const businessuser = await BusinessUsers.findOne({
      businessId: businessId,
      userId: userId,
    });

    if (!businessuser || businessuser.role == "Operator") {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "Only Admin and MiniAdmin is allowed to do this operation"
          )
        );
    }

    const { assetSettings } = req.body;

    if (!Array.isArray(assetSettings) || assetSettings.length === 0) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Invalid assetSettings data"));
    }

    let settings = await Settings.findOne({ businessId });

    if (!settings) {
      settings = new Settings({ businessId, assetInformation: [] });
    }

    assetSettings.forEach((asset) => {
      const { fuelType, units, value } = asset;

      const existingAssetIndex = settings.assetInformation.findIndex(
        (item) => item.fuelType === fuelType
      );

      if (existingAssetIndex !== -1) {
        settings.assetInformation[existingAssetIndex] = {
          fuelType,
          units,
          value,
        };
      } else {
        settings.assetInformation.push({ fuelType, units, value });
      }
    });

    await settings.save();

    return res
      .status(200)
      .json(new ApiResponse(200, settings, "Settings updated successfully"));
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(new ApiResponse(500, { error }, "Internal server error"));
  }
});

const getSettingsData = asyncHandler(async (req, res) => {
  try {
    const businessId = req.params.businessId;
    if (!businessId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Business Id is not provided"));
    }

    const business = await Business.findById(businessId);
    if (!business) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Business  not found"));
    }

    const settingsData = await Settings.findOne({ businessId: businessId });
    if (!settingsData) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Not any settings data found"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, { settingsData }, "Data fetched successfully")
      );
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(new ApiResponse(500, { error }, "Internal server error"));
  }
});

export { addSettingsBusinessData, getSettingsData };
