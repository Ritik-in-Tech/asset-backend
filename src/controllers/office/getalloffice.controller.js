import { Business } from "../../models/business.model.js";
import { Office } from "../../models/office.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const getAllOfficeInBusiness = asyncHandler(async (req, res) => {
  try {
    const businessId = req.params.businessId;
    if (!businessId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Please provide business Id"));
    }

    const business = await Business.findById(businessId);

    if (!business) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Business does not exist"));
    }
    const offices = await Office.find({ businessId: businessId });

    return res
      .status(200)
      .json(new ApiResponse(200, offices, "Offices fetched successfully"));
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          { error },
          "An error occurred while fetching office details"
        )
      );
  }
});

const getOfficeLocationInBusiness = asyncHandler(async (req, res) => {
  try {
    const businessId = req.params.businessId;

    // Validate if businessId is provided
    if (!businessId) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "Business ID is not provided in the request parameters"
          )
        );
    }

    // Fetch the business by ID
    const business = await Business.findById(businessId);

    // Validate if the business exists
    if (!business) {
      return res
        .status(404)
        .json(new ApiResponse(404, {}, "Business not found"));
    }

    // Fetch all offices associated with the given businessId
    const offices = await Office.find({
      businessId: businessId,
    });

    // Extract the required office details
    const officeDetails = offices.map((office) => ({
      id: office._id,
      officeLocation: office.officeLocation,
    }));

    // Send the successful response with the office details
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { offices: officeDetails },
          "Offices retrieved successfully"
        )
      );
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          { error },
          "An error occurred while processing your request"
        )
      );
  }
});

export { getAllOfficeInBusiness, getOfficeLocationInBusiness };
