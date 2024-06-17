import { startSession } from "mongoose";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { Business } from "../../models/business.model.js";
import { generateUniqueCode } from "../../utils/helpers/array.helper.js";
import { BusinessUsers } from "../../models/businessusers.model.js";
import { User } from "../../models/user.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

const createBusiness = asyncHandler(async (req, res) => {
  const session = await startSession();
  session.startTransaction();
  try {
    const {
      buisnessName,
      logo,
      industryType,
      city,
      country,
      businessCategory,
      assetCategory,
    } = req.body;

    // Validation: Check if admin name and contact number are provided
    const adminId = req.user._id;
    const adminName = req.user.name;
    const adminContactNumber = req.user.contactNumber;
    // console.log(adminId);
    // console.log(adminName);
    // console.log(adminContactNumber);
    if (!adminName) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Please update profile and name there"));
    }

    if (!adminContactNumber) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Token is Invalid!!"));
    }

    if (!buisnessName) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Fill name of business!!"));
    }

    const existingCodes = new Set(await Business.distinct("businessCode"));

    const businessCode = generateUniqueCode(existingCodes);
    const businessCategories = [];
    for (const category of businessCategory) {
      businessCategories.push({ name: category });
    }

    const assetCategories = [];
    for (const asset of assetCategory) {
      assetCategories.push({ name: asset });
    }

    const business = await Business.create(
      [
        {
          businessCode: businessCode,
          name: buisnessName,
          industryType: industryType,
          city: city,
          logo: logo || "",
          country: country,
          businessCategory: businessCategories,
          assetCategory: assetCategories,
        },
      ],
      { session: session }
    );

    const adminInfo = {
      userId: adminId,
      businessId: business[0]._id,
      role: "Admin",
      name: adminName,
      userType: "Insider",
      contactNumber: adminContactNumber,
      subordinates: [],
      allSubordinates: [],
      myPinnedIssues: [],
      groupsJoined: [],
    };

    await BusinessUsers.create([adminInfo], { session: session });

    const result = await User.updateOne(
      { _id: adminId },
      {
        $push: {
          business: {
            name: buisnessName,
            businessId: business[0]._id,
            userType: "Insider",
          },
        },
      },
      { session: session }
    );

    if (result.modifiedCount === 0) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json(new ApiResponse(404, {}, "User not found or not updated!"));
    }

    await session.commitTransaction();
    session.endSession();

    return res
      .status(201)
      .json(
        new ApiResponse(
          200,
          { business: business[0] },
          "Business created successfully"
        )
      );
  } catch (error) {
    console.log(error);
    await session.abortTransaction();
    session.endSession();
    return res
      .status(500)
      .json(new ApiResponse(500, {}, "Internal Server Error"));
  }
});

export { createBusiness };
