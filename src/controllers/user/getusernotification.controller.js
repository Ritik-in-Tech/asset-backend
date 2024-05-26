import mongoose from "mongoose";
import Notifications from "../../models/notificationmodel.js";
import { User } from "../../models/user.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const getUserNotification = asyncHandler(async (req, res, next) => {
  try {
    const userId = req?.user?._id;
    const businessId = req?.params?.businessId;
    if (!businessId) {
      return res
        .status(400)
        .json(
          new ApiResponse(400, {}, "Please provide businessId in req params")
        );
    }
    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "User does not exist!!"));
    }
    const notifications = await Notifications.find({
      userId: new mongoose.Types.ObjectId(userId),
      businessId: new mongoose.Types.ObjectId(businessId),
    });
    return res
      .status(200)
      .json(new ApiResponse(200, { notifications }, "User Notifications"));
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, "Internal Server Error"));
  }
});
