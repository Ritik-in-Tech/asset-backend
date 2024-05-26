import { asyncHandler } from "../../utils/asyncHandler.js";
import { Asset } from "../../models/asset.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

const getAllAssets = asyncHandler(async (req, res) => {
  try {
    // Fetch all assets from the database
    const assets = await Asset.find({});

    // Check if assets were found
    if (!assets || assets.length === 0) {
      return res.status(404).json(new ApiResponse(404, {}, "No assets found"));
    }

    // Return the assets in the response
    return res
      .status(200)
      .json(new ApiResponse(200, { assets }, "Assets retrieved successfully"));
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, "Internal Server Error"));
  }
});

export { getAllAssets };
