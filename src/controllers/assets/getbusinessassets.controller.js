import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { Business } from "../../models/business.model.js";
import { Asset } from "../../models/asset.model.js";
const getBusinessAsset = asyncHandler(async (req, res) => {
  try {
    const { businessId } = req.params;

    if (!businessId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Please provide business Id"));
    }

    const business = await Business.findById(businessId);

    if (!business) {
      return res
        .status(404)
        .json(new ApiResponse(404, {}, "Business not found"));
    }

    // Fetch detailed asset information
    const assetDetails = await Promise.all(
      business.assets.map(async (asset) => {
        const fullAssetDetails = await Asset.findById(asset.assetId);
        if (fullAssetDetails) {
          return {
            name: asset.name,
            modelNumber: asset.modelNumber,
            assetId: asset.assetId,
            ...fullAssetDetails.toObject(),
          };
        }
        return null;
      })
    );

    // Filter out any null values (in case an asset wasn't found)
    const filteredAssetDetails = assetDetails.filter((asset) => asset !== null);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          filteredAssetDetails,
          "Business assets retrieved successfully"
        )
      );
  } catch (error) {
    console.error("Error in getBusinessAsset:", error);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, "Internal server error"));
  }
});

export { getBusinessAsset };
