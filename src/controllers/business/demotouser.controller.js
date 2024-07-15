import mongoose from "mongoose";
import { BusinessUsers } from "../../models/businessusers.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { Business } from "../../models/business.model.js";
import { emitNewNotificationEvent } from "../../sockets/notification_socket.js";
import { getCurrentIndianTime } from "../../utils/helpers.js";

export const demoteUser = asyncHandler(async (req, res, next) => {
  const { userIdToDemote } = req.body;
  const businessId = req?.params?.businessId;
  const loggedInUserId = req.user._id;

  if (!userIdToDemote || !businessId) {
    return res
      .status(400)
      .json(new ApiResponse(400, {}, "Provide userIdToDemote and businessId"));
  }

  const business = await Business.findById(businessId);
  if (!business) {
    return res.status(400).json(new ApiResponse(400, {}, "Business not found"));
  }

  const loggedInUserDetails = await BusinessUsers.findOne({
    userId: loggedInUserId,
    businessId: businessId,
  });

  if (!loggedInUserDetails) {
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

  if (loggedInUserDetails.role !== "Admin") {
    return res
      .status(400)
      .json(
        new ApiResponse(400, {}, "Only admin allowed to perform this operation")
      );
  }
  try {
    const loggedInUser = await BusinessUsers.findOne({
      businessId: new mongoose.Types.ObjectId(businessId),
      userId: loggedInUserId,
      userType: "Insider",
    });

    if (!loggedInUser || loggedInUser.role !== "Admin") {
      return res
        .status(403)
        .json(new ApiResponse(403, {}, "Only admins can demote users"));
    }

    const userToDemote = await BusinessUsers.findOne({
      businessId: new mongoose.Types.ObjectId(businessId),
      userId: userIdToDemote,
      userType: "Insider",
    });

    if (!userToDemote) {
      return res
        .status(404)
        .json(
          new ApiResponse(404, {}, "User not found in business as insider!!")
        );
    }

    if (userToDemote.role === "Admin") {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Cannot demote an admin user"));
    }

    if (userToDemote.role === "Operator") {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "User already has the lowest role"));
    }

    const result = await BusinessUsers.updateOne(
      {
        businessId: new mongoose.Types.ObjectId(businessId),
        userId: userIdToDemote,
        userType: "Insider",
      },
      { $set: { role: "User" } }
    );

    if (result.modifiedCount === 0) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "Business not found or user not associated with business"
          )
        );
    }

    const emitData = {
      content: `Your role in business ${business.name} has been demoted to Operator`,
      notificationCategory: "business",
      createdDate: getCurrentIndianTime(),
      businessName: business.name,
      businessId: businessId,
    };
    emitNewNotificationEvent(userIdToDemote, emitData);

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "User role demoted to User successfully"));
  } catch (error) {
    console.error("Error demoting user:", error);
    return res
      .status(500)
      .json(
        new ApiResponse(500, {}, "An error occurred while demoting user role")
      );
  }
});
