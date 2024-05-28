import { asyncHandler } from "../../utils/asyncHandler.js";
import { Asset } from "../../models/asset.model.js";
import { User } from "../../models/user.model.js";
import { Business } from "../../models/business.model.js";
import { BusinessUsers } from "../../models/businessusers.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import mongoose from "mongoose";

const createAsset = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user._id;
    const username = req.user.name;
    const businessId = req.params.businessId;

    if (!userId) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Invalid token please log in again"));
    }

    if (!username) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Please update profile and name there"));
    }

    if (!businessId) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Please add businessId in req.params"));
    }

    // Validate the user exists
    const user = await User.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json(new ApiResponse(404, {}, "User not found"));
    }

    // Validate the business exists
    const business = await Business.findById(businessId).session(session);
    if (!business) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json(new ApiResponse(404, {}, "Business not found"));
    }

    // Validate the user is associated with the business and check the role
    const businessUser = await BusinessUsers.findOne({
      userId,
      businessId,
    }).session(session);
    if (!businessUser) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(403)
        .json(
          new ApiResponse(403, {}, "User is not associated with this business")
        );
    }
    console.log(businessUser.role);

    if (businessUser.role !== "Admin" && businessUser.role !== "MiniAdmin") {
      // Check if the user does not have the required permissions
      await session.abortTransaction();
      session.endSession();
      return res
        .status(403)
        .json(
          new ApiResponse(
            403,
            {},
            "User does not have the required permissions"
          )
        );
    }

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

    // Define valid asset types based on the schema
    const validAssetTypes = ["Fixed", "Moving"];

    // Validation checks
    if (!assetType || !name || !serialNumber) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "Asset type, name, and serial number must be provided"
          )
        );
    }

    if (!validAssetTypes.includes(assetType)) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Invalid asset type provided"));
    }

    // Create the asset
    const asset = new Asset({
      assetType,
      name,
      operatorName,
      serialNumber,
      purchaseDate,
      purchaseAmount,
      expiryDate,
      image,
      invoice,
    });

    // Save the Asset document to the database
    await asset.save({ session });

    // Add the asset details to the business document
    business.assets.push({ name, serialNumber, assetId: asset._id });
    await business.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res
      .status(201)
      .json(new ApiResponse(201, { asset }, "Asset created successfully"));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(error);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, "Internal Server Error"));
  }
});

export { createAsset };
