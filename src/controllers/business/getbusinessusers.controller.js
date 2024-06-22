import mongoose from "mongoose";
import { BusinessUsers } from "../../models/businessusers.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const getBusinessUsers = asyncHandler(async (req, res, next) => {
  try {
    const businessId = req?.params?.businessId;
    console.log(businessId);
    const businessUsers = await BusinessUsers.find(
      { businessId: new mongoose.Types.ObjectId(businessId) },
      { name: 1, userId: 1, userType: 1, role: 1, lastSeen: 1 }
    );

    // console.log("business users: ", businessUsers);

    if (businessUsers) {
      let users = businessUsers;

      let newUsers = [];
      for (let i = 0; i < users?.length; i++) {
        newUsers.push({
          name: users[i].name || "",
          userId: users[i].userId || "",
          role: users[i].role || "",
          userType: users[i].userType || "",
          lastSeen: users[i].lastSeen,
          unseenMessagesCount: 0,
        });
      }

      // console.log(`This is the data of new users: ${newUsers}`);

      return res
        .status(200)
        .json(new ApiResponse(200, { users: newUsers }, "All Business users"));
    } else {
      return res
        .status(404)
        .json(new ApiResponse(404, {}, "Business or users not found"));
    }
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(new ApiResponse(500, { error }, "Internal Server Error"));
  }
});

export { getBusinessUsers };
