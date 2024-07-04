import { User } from "../../models/user.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const checkProfileAndBusiness = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json(new ApiResponse(404, {}, "User not found"));
  }

  let isProfileCompleted = true;
  let isBusinessExist = true;

  // Check if essential profile fields are filled
  if (
    !user.name ||
    user.name === "Guest" ||
    user.name === "test" ||
    !user.contactNumber.number
  ) {
    isProfileCompleted = false;
  }

  // Check if user has any businesses
  if (user.business.length === 0) {
    isBusinessExist = false;
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isBusinessExist, isProfileCompleted },
        "Profile and business check completed"
      )
    );
});

export { checkProfileAndBusiness };
