import { Business } from "../../models/business.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { Asset } from "../../models/asset.model.js";

const getConsumptionLevel = asyncHandler(async (req, res) => {
  try {
    const businessId = req.params.businessId;

    // Check if the businessId is provided
    if (!businessId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Please provide businessId in params"));
    }

    const userId = req.user._id;

    // Check if the userId is valid (from the token)
    if (!userId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Invalid token! Please log in again"));
    }

    // Find the business by ID
    const business = await Business.findById(businessId);

    // Check if the business exists
    if (!business) {
      return res
        .status(404)
        .json(new ApiResponse(404, {}, "Business not found"));
    }

    // Find all assets associated with the given businessId
    const assets = await Asset.find({ businessId: businessId });

    // Extract the consumption categories and filter out duplicates
    const consumptionCategoriesSet = new Set();
    assets.forEach((asset) => {
      consumptionCategoriesSet.add(asset.consumptionCategories);
    });

    // Convert the set to an array to include in the response
    const uniqueConsumptionCategories = Array.from(consumptionCategoriesSet);

    // Respond with the asset data and unique consumption categories
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          //   assets: assets.map((asset) => ({
          //     assetId: asset._id,
          //     consumptionCategories: asset.consumptionCategories,
          //   })),
          uniqueConsumptionCategories: uniqueConsumptionCategories,
        },
        "Assets and unique consumption categories retrieved successfully"
      )
    );
  } catch (error) {
    // Handle errors and send a generic error message
    console.error(error);
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          {},
          "An error occurred while processing your request"
        )
      );
  }
});

// const getLocation

export { getConsumptionLevel };
