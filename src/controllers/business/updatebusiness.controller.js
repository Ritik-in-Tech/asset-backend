import { Business } from "../../models/business.model.js";
import { BusinessUsers } from "../../models/businessusers.model.js";
import { User } from "../../models/user.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
const updateBusinessDetails = asyncHandler(async (req, res) => {
  try {
    const { buisnessName, industryType, city, country, logo } = req.body;
    const businessId = req?.params?.businessId;

    const userId = req.user._id;
    if (!userId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Invalid token please log in again"));
    }

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "User does not exist"));
    }

    if (!businessId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Business ID is required"));
    }

    const business = await Business.findById(businessId);
    if (!business) {
      return res
        .status(404)
        .json(new ApiResponse(404, {}, "Business not found"));
    }

    const businessusers = await BusinessUsers.findOne({
      businessId: businessId,
      userId: userId,
    });

    if (!businessusers || !businessusers.role) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "Logged in user is not associated with the business"
          )
        );
    }

    if (businessusers.role === "Operator") {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "Operator is not authorized to perform this operation"
          )
        );
    }

    // Create an empty object to store the fields to update
    let updateFields = {};

    // Check if each field is provided in the request body and add it to updateFields
    if (buisnessName) {
      updateFields.name = buisnessName;

      const userUpdateResult = await User.updateMany(
        { "business.businessId": businessId },
        { $set: { "business.$[elem].name": buisnessName } },
        { arrayFilters: [{ "elem.businessId": businessId }] }
      );

      if (userUpdateResult.matchedCount === 0) {
        console.log("No users found with the specified businessId");
      } else {
        console.log(`${userUpdateResult.modifiedCount} users updated`);
      }
    }
    if (industryType) {
      updateFields.industryType = industryType;
    }
    if (city) {
      updateFields.city = city;
    }
    if (country) {
      updateFields.country = country;
    }
    if (logo) {
      // Validating the logoURL
      if (!/\.(jpg|jpeg|png)$/i.test(logo)) {
        return res
          .status(400)
          .json(
            new ApiResponse(
              400,
              {},
              "logoUrl must end with .jpg, .jpeg, or .png"
            )
          );
      }
      updateFields.logo = logo;
    }

    // Check if any fields are provided to update
    if (Object.keys(updateFields).length === 0) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "No fields provided to update"));
    }

    // Use $set to update only the provided fields
    const updatedBusiness = await Business.findByIdAndUpdate(
      businessId,
      { $set: updateFields },
      { new: true }
    );

    // Check if businessData is found
    if (!updatedBusiness) {
      return res
        .status(404)
        .json(new ApiResponse(404, {}, "Business not found"));
    }

    const businessData = updatedBusiness.toObject();
    delete businessData.assets;
    delete businessData.offices;
    delete businessData.__v;

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { businessData },
          "Business information updated successfully"
        )
      );
  } catch (error) {
    console.error("Error:", error); // Improved error logging
    return res
      .status(500)
      .json(new ApiResponse(500, { error }, "Internal Server Error"));
  }
});

export { updateBusinessDetails };
