import { Business } from "../../models/business.model.js";
import { BusinessUsers } from "../../models/businessusers.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const getAllOperatorsList = asyncHandler(async (req, res) => {
  try {
    const businessId = req.params.businessId;
    if (!businessId) {
      return res
        .status(400) // Bad Request, businessId not provided
        .json(
          new ApiResponse(400, {}, "BusinessId is not provided in the params")
        );
    }

    const business = await Business.findById(businessId);
    if (!business) {
      return res
        .status(404) // Not Found, business does not exist
        .json(
          new ApiResponse(
            404,
            {},
            "Business not found for the provided businessId"
          )
        );
    }

    const operators = await BusinessUsers.find({
      businessId: businessId,
      role: "Operator",
    }).select("userId name"); // Only select userId and name fields

    if (!operators.length) {
      return res
        .status(404) // Not Found, no operators found
        .json(new ApiResponse(404, {}, "No operators found for this business"));
    }

    // Returning userId and name of the operators
    const operatorList = operators.map((operator) => ({
      userId: operator.userId,
      name: operator.name,
    }));

    return res
      .status(200) // OK, request was successful
      .json(
        new ApiResponse(
          200,
          { operators: operatorList },
          "Operators retrieved successfully"
        )
      );
  } catch (error) {
    console.log(error);
    return res
      .status(500) // Internal Server Error
      .json(new ApiResponse(500, { error }, "Internal server error"));
  }
});

const getCategoryList = asyncHandler(async (req, res) => {
  try {
    const businessId = req.params.businessId;
    if (!businessId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Please provide businessId in params"));
    }
    const business = await Business.findById(businessId);
    if (!business) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Business does not exist"));
    }
    const categoryList = business.businessCategory.map((category) => ({
      name: category.name,
    }));

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { categoryList },
          "Available categories fetched successfully!"
        )
      );
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(new ApiResponse(500, { error }, "Internal server error"));
  }
});

export { getAllOperatorsList, getCategoryList };
