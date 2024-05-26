import { User } from "../../models/user.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import catchAsync from "../../utils/catchAsync.js";

const setFCMToken = catchAsync(async (req, res, next) => {
  try {
    const userId = req.user._id;
    const fcmToken = req.query?.fcmToken;
    // console.log(userId);
    // console.log(fcmToken);
    if (!userId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Token is not valid!"));
    }

    const result = await User.updateOne(
      { _id: userId },
      { $set: { fcmToken: fcmToken } }
    );

    if (result.matchedCount == 1) {
      return res
        .status(200)
        .json(new ApiResponse(200, "FCM Token Updated Successfully!!"));
    }

    return next(new ApiResponse(500, "Something got wrong while updating!!"));
  } catch (error) {
    // Handle errors appropriately (e.g., send an error response or log the error)
    console.error(error);
    return next(
      new ApiResponse(500, `Internal Server Error: ${error.message}`)
    );
  }
});

export { setFCMToken };
