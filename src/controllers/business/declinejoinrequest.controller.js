import mongoose from "mongoose";
import { Business } from "../../models/business.model.js";
import { Requests } from "../../models/requests.model.js";
import { Declinedrequests } from "../../models/declinedrequest.model.js";

// Response and Error handling
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const declineUserJoinRequest = asyncHandler(async (req, res, next) => {
  const { name, userId, reason, contactNumber } = req.body;
  const businessId = req?.params?.businessId;

  // Validation
  if (!name || !userId || !businessId || !reason || !countryCode || !number) {
    return res
      .status(400)
      .json(
        new ApiResponse(
          400,
          {},
          "Fill all required fields: name, userId, businessId, reason, declinedByName, contactNumber"
        )
      );
  }
  const { countryCode, number } = contactNumber;
  const declinedByName = req.user.name;

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const business = await Business.findOne({ _id: businessId });
    if (!business) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Business not found"));
    }
    const declinedRequest = {
      businessId,
      name,
      userId,
      contactNumber: {
        countryCode,
        number,
      },
      reason,
      declinedBy: {
        name: declinedByName,
        id: req.user._id,
      },
    };

    // Delete request from RequestsModel
    const updateResult = await Requests.deleteOne(
      { businessId, userId },
      { session }
    );

    if (updateResult.deletedCount === 0) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json(new ApiResponse(404, {}, "User request not found"));
    }

    // Create declined request
    await Declinedrequests.create([declinedRequest], { session });

    // Notify user
    // const emitData = {
    //   content: `Your request has been declined because ${reason}`,
    //   notificationCategory: "business",
    //   createdDate: getCurrentUTCTime(),
    //   businessName: business.name,
    //   businessId,
    // };

    // Emit notification event
    // emitNewNotificationEvent(userId, emitData);

    await session.commitTransaction();
    session.endSession();
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Request declined successfully"));
  } catch (error) {
    console.error("Error:", error);
    await session.abortTransaction();
    session.endSession();
    return res
      .status(500)
      .json(new ApiResponse(500, { error }, "Internal Server Error"));
  }
});

export { declineUserJoinRequest };
