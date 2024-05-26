import { asyncHandler } from "../../utils/asyncHandler.js";
import { Asset } from "../../models/asset.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

const createAsset = asyncHandler(async (req, res) => {
  try {
    const {
      assetType,
      name,
      operatorName,
      serialNumber,
      purchaseDate,
      purchaseAmount,
      expiryDate,
      image,
      invoice,
    } = req.body;

    const adminName = req.user.name;
    const adminContactNumber = req.user.contactNumber;

    // Define valid asset types based on the schema
    const validAssetTypes = ["Fixed", "Moving"];

    // Validation checks
    if (!adminName) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Please update profile and name there"));
    }
    if (!adminContactNumber) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Token is Invalid!!"));
    }
    if (!assetType || !name) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "Asset type and name of the asset is not provided"
          )
        );
    }
    if (!serialNumber) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Serial number is not provided"));
    }
    if (!validAssetTypes.includes(assetType)) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Invalid asset type provided"));
    }

    // Create the asset
    const asset = await Asset.create({
      assetType: assetType,
      name: name,
      operatorName: operatorName,
      serialNumber: serialNumber,
      purchaseDate: purchaseDate,
      purchaseAmount: purchaseAmount,
      expiryDate: expiryDate,
      image: image,
      invoice: invoice,
    });

    // Return a success response
    return res
      .status(201)
      .json(new ApiResponse(200, { asset }, "Asset created successfully"));
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, "Internal Server Error"));
  }
});

export { createAsset };
