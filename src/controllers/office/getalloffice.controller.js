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
          {},
          "An error occurred while fetching office details"
        )
      );
  }
});

export { getAllOfficeInBusiness };
