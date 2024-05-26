import { User } from "../../models/user.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const getUserAvatar = asyncHandler(async (req, res, next) => {
  try {
    const userId = req?.user?._id;

    const user = await User.findOne({ _id: userId });

    if (!user || !user._id) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "User does not exist!!"));
    }

    if (!user?.avatar) {
      return res
        .status(404)
        .json(new ApiResponse(404, {}, "User avatar does not exist!!"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, { avatar: user.avatar }, "User Avatar"));
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, "Internal Server Error"));
  }
});

export { getUserAvatar };
