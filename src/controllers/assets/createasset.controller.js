import { asyncHandler } from "../../utils/asyncHandler.js";
import { Asset } from "../../models/asset.model.js";
import { User } from "../../models/user.model.js";
import { Business } from "../../models/business.model.js";
import { BusinessUsers } from "../../models/businessusers.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import mongoose from "mongoose";
import { Office } from "../../models/office.model.js";

const createAsset = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user._id;
    if (!userId) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(401)
        .json(new ApiResponse(401, {}, "Invalid token! Please Log in again"));
    }

    const username = req.user.name;
    if (!username) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "Admin name not found! Please update profile"
          )
        );
    }

    const businessId = req.params.businessId;
    if (!businessId) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Business Id is not provided"));
    }

    const business = await Business.findById(businessId).session(session);
    if (!business) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json(new ApiResponse(404, {}, "Business not found"));
    }

    const businessUser = await BusinessUsers.findOne({
      userId,
      businessId,
    }).session(session);
    if (!businessUser) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(403) // Forbidden, user not associated with business
        .json(
          new ApiResponse(403, {}, "Admin is not associated with this business")
        );
    }

    if (businessUser.role !== "Admin" && businessUser.role !== "MiniAdmin") {
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
      typeAsset,
      name,
      categoryType,
      operatorId,
      serialNumber,
      purchaseDate,
      consumptionRate,
      purchaseAmount,
      expiryDate,
      image,
      invoice,
      officeIds,
    } = req.body;

    const validAssetTypes = ["Fixed", "Moving"];
    if (
      !assetType ||
      !name ||
      !serialNumber ||
      !operatorId ||
      !typeAsset ||
      !officeIds
    ) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400) // Bad Request, missing essential fields
        .json(
          new ApiResponse(
            400,
            {},
            "Asset type, name, operatorId and serial number must be provided"
          )
        );
    }

    if (!validAssetTypes.includes(assetType)) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400) // Bad Request, invalid asset type
        .json(new ApiResponse(400, {}, "Invalid asset type provided"));
    }

    const categoryExists = business.businessCategory.some(
      (category) => category.name.toLowerCase() === categoryType.toLowerCase()
    );

    if (!categoryExists) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "The provided category type does not exist for this business"
          )
        );
    }

    const typeAssetExists = business.assetCategory.some(
      (asset) => asset.name.toLowerCase() === typeAsset.toLowerCase()
    );

    if (!typeAssetExists) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "The provided asset type does not exist for this business"
          )
        );
    }

    const existingAssetBySerial = business.assets.find(
      (asset) => asset.serialNumber === serialNumber
    );
    if (existingAssetBySerial) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(409) // Conflict, asset with same serial number exists
        .json(
          new ApiResponse(
            409,
            {},
            "Asset with the same serial number already exists"
          )
        );
    }

    const operatorUser = await User.findById(operatorId);
    if (!operatorUser) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404) // Not Found, operator does not exist
        .json(
          new ApiResponse(
            404,
            {},
            "User with the provided operator ID does not exist"
          )
        );
    }

    const checkOperatorInBusiness = await BusinessUsers.findOne({
      businessId: businessId,
      userId: operatorId,
    }).session(session);

    if (!checkOperatorInBusiness) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400) // Bad Request, operator not in same business
        .json(new ApiResponse(400, {}, "Operator is not in the same business"));
    }

    if (checkOperatorInBusiness.role !== "Operator") {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400) // Bad Request, invalid role for operator
        .json(
          new ApiResponse(
            400,
            {},
            "Only operator can be assigned with any asset"
          )
        );
    }

    const officeAssigned = [];

    for (const officeId of officeIds) {
      const office = await Office.findOne({ _id: officeId }).session(session);
      if (!office) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json(
            new ApiResponse(
              400,
              {},
              `Office with id ${officeId} does not exist`
            )
          );
      }
      // validOfficeIds.push(office._id);
      officeAssigned.push({ officeId: office._id, name: office.officeName });
    }

    // Create the asset
    const asset = new Asset({
      assetType,
      typeAsset,
      name,
      businessId: business._id,
      serialNumber,
      categoryType: categoryType,
      consumptionRate,
      purchaseDate,
      purchaseAmount,
      expiryDate,
      image,
      invoice,
      officeAssigned: officeAssigned,
    });

    // Save the Asset document to the database
    await asset.save({ session });

    // Add operator and createdBy information to the asset
    asset.operator.push({
      operatorName: operatorUser.name,
      operatorId: operatorId,
    });

    asset.createdBy.push({
      createdByName: username,
      adminId: userId,
    });
    await asset.save({ session });

    // Add the asset details to the business document
    business.assets.push({ name, serialNumber, assetId: asset._id });
    await business.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res
      .status(201) // Created, asset successfully created
      .json(new ApiResponse(201, { asset }, "Asset created successfully"));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error(error);
    return res
      .status(500) // Internal Server Error, generic failure
      .json(new ApiResponse(500, {}, "Internal Server Error"));
  }
});

export { createAsset };
