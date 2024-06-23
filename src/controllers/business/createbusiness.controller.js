import { startSession } from "mongoose";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { Business } from "../../models/business.model.js";
import { generateUniqueCode } from "../../utils/helpers/array.helper.js";
import { BusinessUsers } from "../../models/businessusers.model.js";
import { User } from "../../models/user.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { Office } from "../../models/office.model.js";

const createBusiness = asyncHandler(async (req, res) => {
  const session = await startSession();
  session.startTransaction();
  try {
    const {
      businessName, // corrected typo: 'buisnessName' to 'businessName'
      logo,
      industryType,
      city, // updated to accept cityOffices structure
      country,
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

    const existingCodes = new Set(await Business.distinct("businessCode"));
    const businessCode = generateUniqueCode(existingCodes);

    // Create the new business entry
    const business = await Business.create(
      [
        {
          businessCode: businessCode,
          name: businessName,
          industryType: industryType,
          logo: logo || "",
          country: country,
          city: city,
          offices: [],
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
      officeJoined: [],
    };

    const office = await Office.findOne({
      businessId: business[0]._id,
      officeName: businessName,
    });

    if (office) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(400)
        .json(
          new ApiResponse(400, {}, "Business already has this office location")
        );
    }

    // Create the office
    const newOffice = await Office.create(
      [
        {
          businessId: business[0]._id,
          officeName: businessName,
        },
      ],
      { session: session }
    );

    // Update the business document to include the new office
    await Business.updateOne(
      { _id: business[0]._id },
      {
        $push: {
          offices: {
            officeName: businessName,
            officeId: newOffice[0]._id,
          },
        },
      },
      { session: session }
    );

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
      .json(new ApiResponse(500, { error }, "Internal Server Error"));
  }
});

export { createBusiness };
