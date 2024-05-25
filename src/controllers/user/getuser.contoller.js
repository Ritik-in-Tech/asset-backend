import { asyncHandler } from "../../utils/asyncHandler";
import { User } from "../../models/user.model";
import { BusinessUsers } from "../../models/businessusers.model";
import { Requests } from "../../models/requests.model";
const getUser = asyncHandler(async (req, res, next) => {
  const userId = req?.user?._id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "User does not exist!!"));
    }

    const businessWithData = [];
    for (const business of user.business) {
      const businessUser = await BusinessUsers.findOne({
        userId: userId,
        businessId: business?.businessId,
      });
      let pendingRequests = 0;
      if (businessUser.role == "Admin" || businessUser.role == "MiniAdmin") {
        pendingRequests = await Requests.find({
          businessId: business?.businessId,
        });
      }
      const additionalData = {
        pendingRequest: pendingRequests?.length || 0,
        userRole: businessUser ? businessUser?.role || "User" : "User",
        activityCounter: businessUser
          ? businessUser?.activityViewCounter || 0
          : 0,
      };
      const businessData = {
        ...business.toObject(), // Spread business data
        ...additionalData, // Spread additional data
      };
      businessWithData.push(businessData);
    }
    const responseData = {
      _id: user._id,
      name: user.name,
      jobTitle: user.jobTitle,
      contactNumber: user.contactNumber,
      notificationViewCounter: user.notificationViewCounter,
      email: user.email,
      business: businessWithData,
    };
    return res
      .status(200)
      .json(new ApiResponse(200, responseData, "User data"));
  } catch (error) {
    console.error("Error in getUser:", error);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, "Internal Server Error"));
  }
});

export { getUser };
