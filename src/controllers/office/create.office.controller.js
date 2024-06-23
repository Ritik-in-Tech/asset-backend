import mongoose from "mongoose";
import { Office } from "../../models/office.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { Business } from "../../models/business.model.js";
import { User } from "../../models/user.model.js";
import { BusinessUsers } from "../../models/businessusers.model.js";

const createOffice = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const businessId = req.params.businessId;
    const { officesArray } = req.body;

    // Validate request body
    if (
      !officesArray ||
      !Array.isArray(officesArray) ||
      officesArray.length === 0
    ) {
      return res
        .status(400)
        .json(
          new ApiResponse(400, {}, "officesArray must be a non-empty array")
        );
    }

    const isValidOfficesArray = officesArray.every(
      (office) =>
        Array.isArray(office) &&
        office.length === 2 &&
        typeof office[0] === "string" &&
        office[0].trim() !== "" &&
        typeof office[1] === "string"
    );

    if (!isValidOfficesArray) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "officesArray must contain pairs of [office, parent office], where office is a non-empty string and parent office is a string"
          )
        );
    }

    // Validate businessId
    if (!businessId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Please provide businessId in params"));
    }

    // Fetch the business
    const business = await Business.findById(businessId).session(session);
    if (!business) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Business does not exist"));
    }

    const userId = req.user._id;
    if (!userId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Invalid token please log in again"));
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "User does not exist"));
    }

    const businessusers = await BusinessUsers.findOne({
      businessId: businessId,
      userId: userId,
    });
    // console.log(businessusers.role);

    if (!businessusers) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "Logged in user is not associated with the business"
          )
        );
    }

    if (businessusers.role !== "Admin" && businessusers.role !== "MiniAdmin") {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "Only admin and miniadmin have access to create offices"
          )
        );
    }

    const createdOffices = [];

    for (const [officeName, parentOfficeName] of officesArray) {
      // Check if the office already exists for this business
      const existingOffice = await Office.findOne({
        businessId: businessId,
        officeName: officeName,
      }).session(session);

      if (existingOffice) {
        await session.abortTransaction();
        session.endSession();
        return res
          .status(400)
          .json(
            new ApiResponse(
              400,
              {},
              `Office '${officeName}' already exists for this business`
            )
          );
      }

      let parentOfficeId = null;
      let parentOffice;
      if (parentOfficeName) {
        // Find the parent office
        parentOffice = await Office.findOne({
          businessId: businessId,
          officeName: parentOfficeName,
        }).session(session);

        if (!parentOffice) {
          await session.abortTransaction();
          session.endSession();
          return res
            .status(400)
            .json(
              new ApiResponse(
                400,
                {},
                `Parent office '${parentOfficeName}' not found`
              )
            );
        }

        parentOfficeId = parentOffice._id;
      }
      // console.log(parentOfficeId);

      // Create the new office
      const newOffice = new Office({
        officeName: officeName,
        businessId: businessId,
        parentOfficeId: parentOfficeId,
      });

      await newOffice.save({ session });

      business.offices.push({
        officeName: newOffice.officeName,
        officeId: newOffice._id,
      });

      await business.save({ session });

      if (parentOffice) {
        parentOffice.subordinates.push(newOffice._id);
        parentOffice.allSubordinates.push(newOffice._id);
        await parentOffice.save({ session });

        // Update all ancestors' allSubordinates
        let currentParent = parentOffice;
        while (currentParent.parentOfficeId) {
          currentParent = await Office.findById(
            currentParent.parentOfficeId
          ).session(session);
          currentParent.allSubordinates.push(newOffice._id);
          await currentParent.save({ session });
        }
      }
      createdOffices.push(newOffice);
    }

    // If we've reached this point, all offices were created successfully
    await session.commitTransaction();
    session.endSession();

    return res
      .status(201)
      .json(
        new ApiResponse(201, { createdOffices }, "Offices created successfully")
      );
  } catch (error) {
    // Abort the transaction in case of error
    await session.abortTransaction();
    session.endSession();
    console.log(error);

    return res
      .status(500)
      .json(new ApiResponse(500, { error }, "Internal server error"));
  }
});

export { createOffice };
