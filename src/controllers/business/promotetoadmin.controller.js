import mongoose from "mongoose";
const { startSession } = mongoose;
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { BusinessUsers } from "../../models/businessusers.model.js";

const promoteToAdmin = asyncHandler(async (req, res, next) => {
  const session = await startSession();
  session.startTransaction();

  try {
    const userIdToPromote = req?.params?.userIdToPromote;
    const businessId = req?.params?.businessId;
    const userId = req?.user?._id;
    if (!userId) {
      return res.status(401).json(new ApiResponse(401, {}, "Invalid Token"));
    }

    if (!userIdToPromote || !businessId) {
      return res
        .status(401)
        .json(
          new ApiResponse(401, {}, "Provide  userIdToPromote, and businessId")
        );
    }

    const user = await BusinessUsers.findOne({
      businessId: new mongoose.Types.ObjectId(businessId),
      userId: userId,
      userType: "Insider",
    });

    if (!user || !user.role) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "User not found or user not associated with business!!"
          )
        );
    }

    if (user.role != "Admin") {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "You do not have permission to perform this task!!"
          )
        );
    }

    const userToPromote = await BusinessUsers.findOne({
      businessId: new mongoose.Types.ObjectId(businessId),
      userId: userIdToPromote,
      userType: "Insider",
    });

    if (!userToPromote) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "User to promote not found"));
    }

    if (userToPromote.role == "Admin") {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "User is already admin"));
    }

    const subordinates = userToPromote.subordinates || [];
    // const issueIdsToUpdate = userToPromote.assignedToMeIssues || [];

    // Update parent user of the user's subordinates
    await BusinessUsers.updateMany(
      { businessId: businessId, userId: { $in: subordinates } },
      {
        $set: {
          parentId: userToPromote.parentId,
        },
      },
      { session }
    );

    // add subordinates in parent user
    await BusinessUsers.updateOne(
      { businessId: businessId, userId: userToPromote.parentId },
      {
        $push: {
          subordinates: { $each: subordinates },
        },
      },
      { session: session }
    );

    // Remove user from subordinates list of the parent user
    await BusinessUsers.updateMany(
      { businessId: businessId },
      {
        $pull: {
          subordinates: userIdToPromote,
          allSubordinates: userIdToPromote,
        },
      },
      { session: session }
    );

    const filteredSubordinates = user.subordinates.filter(
      (id) => !id.equals(userIdToPromote)
    );
    const filteredAllSubordinates = user.allSubordinates.filter(
      (id) => !id.equals(userIdToPromote)
    );

    await BusinessUsers.updateOne(
      {
        businessId: new mongoose.Types.ObjectId(businessId),
        userId: userIdToPromote,
        userType: "Insider",
      },
      {
        $set: {
          role: "Admin",
          subordinates: filteredSubordinates,
          allSubordinates: filteredAllSubordinates,
        },
        $unset: {
          "users.$.parentId": "",
        },
      },
      { session: session }
    );

    await session.commitTransaction();
    session.endSession();

    return res
      .status(200)
      .json(
        new ApiResponse(200, {}, "User role updated to Admin successfully")
      );
  } catch (error) {
    console.log(error);
    await session.abortTransaction();
    session.endSession();
    return res
      .status(500)
      .json(new ApiResponse(500, {}, "Internal server error"));
  }
});

export { promoteToAdmin };
