import { asyncHandler } from "../../utils/asyncHandler.js";
import { Asset } from "../../models/asset.model.js";
import { Maintenance } from "../../models/maintenanceschema.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import mongoose from "mongoose";

const addMaintenanceDetails = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      assetType,
      name,
      yearOfService,
      nextServiceDate,
      nextInsuranceDate,
    } = req.body;
    const adminName = req.user.name;
    const adminContactNumber = req.user.contactNumber;

    const serialNumber = req.params.serialNumber;
    if (!serialNumber) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "Serial number is not provided in the params"
          )
        );
    }

    // Define valid asset types based on the schema
    const validAssetTypes = ["Fixed", "Moving"];

    // Check if the admin name is provided
    if (!adminName) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "Please update profile and add your name there"
          )
        );
    }

    // Check if the admin contact number is provided
    if (!adminContactNumber) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Token is Invalid!"));
    }

    // Check if assetType and name are provided
    if (!assetType || !name) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "Asset type and name of the asset must be provided"
          )
        );
    }

    // Validate assetType against valid asset types
    if (!validAssetTypes.includes(assetType)) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Invalid asset type provided"));
    }

    // Check if the asset exists in the Asset collection
    const asset = await Asset.findOne({ serialNumber }).session(session);
    if (!asset) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json(
          new ApiResponse(
            404,
            {},
            "Asset with the provided serial number does not exist"
          )
        );
    }

    // Check if the asset already has maintenance details
    if (asset.maintainenace.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "Maintenance details already exist for this asset"
          )
        );
    }

    // Create a new Maintenance document
    const maintenance = new Maintenance({
      assetType,
      name,
      yearOfService,
      nextServiceDate,
      nextInsuranceDate,
    });

    // Save the Maintenance document to the database
    await maintenance.save({ session });

    // Update the Asset document with the new maintenance details
    asset.maintainenace.push({
      name: maintenance.name,
      maintenanceId: maintenance._id,
    });

    // Save the updated Asset document
    await asset.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { maintenance },
          "Maintenance details added successfully"
        )
      );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error:", error);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, "Internal Server Error"));
  }
});

export { addMaintenanceDetails };
