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
      businessName, // corrected typo: 'buisnessName' to 'businessName'
      logo,
      industryType,
      cityOffices, // updated to accept cityOffices structure
      country,
      businessCategory,
      assetCategory,
    } = req.body;

    // Validation: Check if admin name and contact number are provided
    const adminId = req.user._id;
    const adminName = req.user.name;
    const adminContactNumber = req.user.contactNumber;

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

    if (!businessName) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Fill name of business!!"));
    }

    if (!Array.isArray(cityOffices)) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "cityOffices must be an array"));
    }
    const existingCodes = new Set(await Business.distinct("businessCode"));
    const businessCode = generateUniqueCode(existingCodes);

    // Convert businessCategory and assetCategory into schema-compatible format
    const businessCategories = businessCategory.map((category) => ({
      name: category,
    }));
    const assetCategories = assetCategory.map((asset) => ({ name: asset }));

    // Format cityOffices to match the new schema
    const formattedCityOffices = cityOffices.map((cityOffice) => {
      if (!Array.isArray(cityOffice) || cityOffice.length < 2) {
        throw new Error(
          "Each cityOffices entry must be an array with at least one city and one office"
        );
      }
      return {
        city: cityOffice[0],
        offices: cityOffice.slice(1),
      };
    });

    // Create the new business entry
    const business = await Business.create(
      [
        {
          businessCode: businessCode,
          name: businessName,
          industryType: industryType,
          cityOffices: formattedCityOffices, // use the new cityOffices format
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

    // Create business user entry
    await BusinessUsers.create([adminInfo], { session: session });

    // Update the user's business information
    const result = await User.updateOne(
      { _id: adminId },
      {
        $push: {
          business: {
            name: businessName,
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
