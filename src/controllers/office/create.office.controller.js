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
    const { officeName, officeCity, officeState, officeDirection } = req.body;

    // Validate request body
    if (!officeName || !officeCity || !officeState || !officeDirection) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Please fill all the requested fields"));
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

    if (businessusers.role !== "Admin") {
      return res
        .status(400)
        .json(
          new ApiResponse(400, {}, "Only admin have access to create offices")
        );
    }

    // Create new office
    const officeDetails = new Office({
      officeName,
      businessId,
      officeCity,
      officeState,
      officeDirection,
    });

    // Save the office
    await officeDetails.save({ session });

    // Update the business document
    business.offices.push({ name: officeName, officeId: officeDetails._id });
    await business.save({ session });

    user.offices.push({ name: officeName, officeId: officeDetails._id });
    await user.save({ session });

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    return res
      .status(201)
      .json(
        new ApiResponse(201, { officeDetails }, "Office created successfully!")
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
