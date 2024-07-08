import catchAsync from "../../utils/catchAsync.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { User } from "../../models/user.model.js";
import { Business } from "../../models/business.model.js";
import { BusinessUsers } from "../../models/businessusers.model.js";
import { Requests } from "../../models/requests.model.js";
import { Acceptedrequests } from "../../models/acceptedrequest.model.js";
import { Declinedrequests } from "../../models/declinedrequest.model.js";
import { getCurrentIndianTime } from "../../utils/helpers/time.helper.js";
import { emitNewNotificationEvent } from "../../sockets/notification_socket.js";
const joinBusiness = catchAsync(async (req, res, next) => {
  const { businessCode } = req.params;
  const userId = req.user._id;

  try {
    if (!businessCode || businessCode.length != 6 || !userId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Enter a valid business code!!"));
    }
    if (!userId) {
      return res.status(400).json(new ApiResponse(400, {}, "Invalid Token!"));
    }

    const [user, businessData] = await Promise.all([
      User.findById(userId),
      Business.findOne({ businessCode }).populate("_id"),
    ]);
    // console.log(user);

    if (!user) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "User does not exist!!"));
    }

    if (!businessData || !businessData._id) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Business does not exist!!"));
    }

    const businessId = businessData._id;

    const existingUser = await BusinessUsers.findOne({
      businessId,
      userId,
    });
    if (existingUser) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "User already exists in business!!"));
    }

    const existingRequest = await Requests.findOne({ businessId, userId });
    if (existingRequest) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "User already sent a request to join this business!!"
          )
        );
    }
    const existingDeclinedRequest = await Declinedrequests.findOne({
      businessId,
      userId,
    });
    if (existingDeclinedRequest) {
      return res
        .status(400)
        .json(
          new ApiResponse(400, {}, "Your request has already been declined!!")
        );
    }

    const existingAcceptedRequest = await Acceptedrequests.findOne({
      businessId,
      userId,
    });
    if (existingAcceptedRequest) {
      await session.abortTransaction();
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "User already present in business!!"));
    }

    const requestedUser = {
      businessId: businessData._id,
      name: user.name,
      contactNumber: user.contactNumber,
      userId,
    };

    await Requests.create(requestedUser);

    const emitData = {
      content: `New Join Request: ${user.name} is eager to join your ${businessData.name} business. Act now!`,
      notificationCategory: "business",
      createdDate: getCurrentIndianTime(),
      businessName: businessData.name,
      businessId: businessData._id,
    };

    const businessAdmins = await BusinessUsers.find(
      { businessId, role: "Admin" },
      { name: 1, userId: 1 }
    );

    await Promise.all(
      businessAdmins.map(async (admin) => {
        await emitNewNotificationEvent(admin.userId, emitData);
      })
    );

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Request sent successfully"));
  } catch (error) {
    console.error("Error : ", error);
    return res
      .status(500)
      .json(new ApiResponse(500, { error }, "Internal Server Error"));
  }
});
export { joinBusiness };
