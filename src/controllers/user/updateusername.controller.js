import { BusinessUsers } from "../../models/businessusers.model.js";
import { User } from "../../models/user.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const updateUserName = asyncHandler(async (req, res) => {
  try {
    const userId = req?.user?._id;
    const newName = req?.params?.newName;
    // Construct the query to find the user by _id and update their name
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId }, // Find user by _id
      { $set: { name: newName } }, // Update user's name
      { new: true } // Return the updated document
    );

    // console.log(updatedUser);
    if (updatedUser.matchedCount == 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, {}, "User does not exist!!"));
    }

    await BusinessUsers.updateMany(
      { userId: userId },
      {
        $set: {
          name: newName,
        },
      }
    );

    return res
      .status(200)
      .json(new ApiResponse(200, updatedUser, "Name updated successfully!!"));
  } catch (error) {
    // console.log(error);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, "Internal Server Error"));
  }
});
