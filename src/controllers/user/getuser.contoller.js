import { asyncHandler } from "../../utils/asyncHandler.js";
import { User } from "../../models/user.model.js";
import { BusinessUsers } from "../../models/businessusers.model.js";
import { Requests } from "../../models/requests.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { Business } from "../../models/business.model.js";
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
      const businessId = business?.businessId;
      const businessUser = await BusinessUsers.findOne({
        userId: userId,
        businessId: businessId,
      });

      let pendingRequests = 0;
      if (
        businessUser?.role === "Admin" ||
        businessUser?.role === "MiniAdmin"
      ) {
        pendingRequests = await Requests.countDocuments({
          businessId: businessId,
        });
      }

      const businessInfo = await Business.findById(businessId);
      const businessCode = businessInfo?.businessCode || "";
      const businessCategories = businessInfo?.businessCategory;

      const additionalData = {
        pendingRequest: pendingRequests || 0,
        userRole: businessUser ? businessUser?.role || "User" : "User",
        activityCounter: businessUser
          ? businessUser?.activityViewCounter || 0
          : 0,
        businessCode: businessCode,
        businessCategories: businessCategories,
      };

      const businessData = {
        ...business.toObject(),
        ...additionalData,
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
      fcmToken: user.fcmToken,
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
