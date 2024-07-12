import mongoose from "mongoose";
import { asyncHandler } from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import { BusinessUsers } from "../../models/businessusers.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

export const changeManager = asyncHandler(async (req, res) => {
  const { businessId, userId } = req.params;
  const { newParentId } = req.query;

  const loggedInUser = req.user._id;
  if (!loggedInUser) {
    return res
      .status(404)
      .json(new ApiResponse(404, {}, "Invalid token please log in again"));
  }
  if (!businessId) {
    return res
      .status(404)
      .json(
        new ApiResponse(404, {}, "Business Id is not provided in the params")
      );
  }

  if (!newParentId) {
    return res
      .status(404)
      .json(
        new ApiResponse(404, {}, "Please provide the newParentId in req query")
      );
  }

  const checkEligibility = await BusinessUsers.findOne({
    userId: loggedInUser,
    businessId: businessId,
  });

  if (!checkEligibility || !checkEligibility.role) {
    return res
      .status(404)
      .json(
        new ApiResponse(404, {}, "Role is not found for the logged in user")
      );
  }

  if (checkEligibility.role !== "Admin") {
    return res
      .status(404)
      .json(new ApiResponse(404, {}, "Only admin can change user manager"));
  }
  //   console.log("Hello");
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await BusinessUsers.findOne({
      businessId,
      userId,
      userType: "Insider",
    });
    const newParentUser = await BusinessUsers.findOne({
      businessId,
      userId: newParentId,
      userType: "Insider",
    });
    // console.log("This is user ", user);
    // console.log("This is parent ", newParentUser);
    if (!user || !user.userId) {
      return res.status(404).send({ message: "User not found in business!!" });
    }

    if (!user || !newParentUser.userId) {
      return res
        .status(404)
        .send({ message: "Manager not found in business!!" });
    }

    // console.log("This is user ", user);
    // console.log("This is parent ", newParentUser);

    const subordinates = user.subordinates || [];
    let allSubordinates = user.allSubordinates || [];
    allSubordinates = [...allSubordinates, new mongoose.Types.ObjectId(userId)];
    // console.log("Hello");
    // console.log("This is allsubordinates :", allSubordinates);

    if (
      allSubordinates.some(
        (subordinate) =>
          subordinate.toString() === newParentUser.userId.toString()
      )
    ) {
      //   console.log("It contains.....");
    } else {
      //   console.log("It does not contains.....");

      const parentUsers =
        (await BusinessUsers.find(
          {
            businessId,
            allSubordinates: {
              $elemMatch: { $eq: new mongoose.Types.ObjectId(userId) },
            },
            userType: "Insider",
          },
          { userId: 1 }
        )) || [];

      //   console.log("This is parents data : ", parentUsers);

      let _userIds = parentUsers.map((user) => user.userId);

      await BusinessUsers.updateMany(
        { businessId: businessId, userId: { $in: _userIds } },
        {
          $pull: {
            allSubordinates: { $in: allSubordinates },
            subordinates: new mongoose.Types.ObjectId(userId),
          },
        },
        { session }
      );

      // Now add that to new place

      const parentUsersOfNewManager =
        (await BusinessUsers.find(
          {
            businessId,
            allSubordinates: {
              $elemMatch: { $eq: new mongoose.Types.ObjectId(newParentId) },
            },
            userType: "Insider",
          },
          { userId: 1 }
        )) || [];

      //   console.log("This is parents data : ", parentUsersOfNewManager);

      let userIds = parentUsersOfNewManager.map((user) => user.userId);

      userIds = [...userIds, new mongoose.Types.ObjectId(newParentId)];

      await BusinessUsers.updateMany(
        { businessId: businessId, userId: { $in: userIds } },
        {
          $addToSet: {
            allSubordinates: { $each: allSubordinates },
          },
        },
        { session }
      );

      await BusinessUsers.updateOne(
        {
          businessId: businessId,
          userId: new mongoose.Types.ObjectId(newParentId),
        },
        {
          $addToSet: {
            subordinates: userId,
          },
        },
        { session }
      );

      await BusinessUsers.updateOne(
        {
          businessId: businessId,
          userId: new mongoose.Types.ObjectId(userId),
        },
        {
          $set: {
            parentId: newParentId,
          },
        },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    res
      .status(200)
      .json(new ApiResponse(200, "User parent changed successfully."));
  } catch (error) {
    // console.error("Failed to change user parent Error:", error);
    await session.abortTransaction();
    session.endSession();
    res
      .status(500)
      .json(new ApiResponse(500, `Internal server error: ${error}`));
  }
});
