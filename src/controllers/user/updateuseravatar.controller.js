import { User } from "../../models/user.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const updateUserAvtar = asyncHandler(async (req, res, next) => {
  try {
    const userId = req?.user._id;
    // const userId = req?.user?._id;
    if (!req.body || !req.body.avatar) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Please provide a avatar URL"));
    }
    const userAvatar = req?.body?.avatar;

    // Validate the avatar URL
    if (!/\.(jpg|jpeg|png)$/i.test(userAvatar)) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "Avatar URL must end with .jpg, .jpeg, or .png"
          )
        );
    }
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { avatar: userAvatar } },
      { new: true }
    );

    if (updatedUser.matchedCount == 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, {}, "User does not exist!!"));
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, { avatar: updatedUser.avatar }, "Avatar updated")
      );
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, "Internal Server Error"));
  }
});
