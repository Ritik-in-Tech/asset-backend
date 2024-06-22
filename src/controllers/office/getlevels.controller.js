import { Business } from "../../models/business.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { Asset } from "../../models/asset.model.js";
import { Office } from "../../models/office.model.js";

const getConsumptionLevel = asyncHandler(async (req, res) => {
  try {
    const businessId = req.params.businessId;

    // Check if the businessId is provided
    if (!businessId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Please provide businessId in params"));
    }

    const userId = req.user._id;

    // Check if the userId is valid (from the token)
    if (!userId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Invalid token! Please log in again"));
    }

    // Find the business by ID
    const business = await Business.findById(businessId);

    // Check if the business exists
    if (!business) {
      return res
        .status(404)
        .json(new ApiResponse(404, {}, "Business not found"));
    }

    // Find all assets associated with the given businessId
    const assets = await Asset.find({ businessId: businessId });

    // Extract the consumption categories and filter out duplicates
    const consumptionCategoriesSet = new Set();
    assets.forEach((asset) => {
      consumptionCategoriesSet.add(asset.consumptionCategories);
    });

    // Convert the set to an array to include in the response
    const uniqueConsumptionCategories = Array.from(consumptionCategoriesSet);

    // Respond with the asset data and unique consumption categories
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          //   assets: assets.map((asset) => ({
          //     assetId: asset._id,
          //     consumptionCategories: asset.consumptionCategories,
          //   })),
          uniqueConsumptionCategories: uniqueConsumptionCategories,
        },
        "Assets and unique consumption categories retrieved successfully"
      )
    );
  } catch (error) {
    // Handle errors and send a generic error message
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

const getLocation1stLevels = asyncHandler(async (req, res) => {
  try {
    const businessId = req.params.businessId;

    // Validate if businessId is provided
    if (!businessId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Please provide businessId in params"));
    }

    // Validate if userId is provided from token
    const userId = req.user._id;
    if (!userId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Invalid token. Please log in again"));
    }

    // Find top-level offices (no parentOfficeId) for the given businessId
    const topLevelOffices = await Office.find({
      businessId: businessId,
      parentOfficeId: null,
    });

    if (!topLevelOffices || topLevelOffices.length === 0) {
      return res
        .status(404)
        .json(
          new ApiResponse(
            404,
            {},
            "No top-level offices found for the given business"
          )
        );
    }

    // Initialize array to hold the final result
    const location1stLevels = [];

    // Iterate through each top-level office to fetch their subordinates' details
    for (const office of topLevelOffices) {
      // Fetch details of subordinates
      const subordinates = await Office.find({
        _id: { $in: office.subordinates },
      });

      // Map the subordinates to include only ID and name
      const subordinatesInfo = subordinates.map((sub) => ({
        id: sub._id,
        officeLocation: sub.officeLocation,
      }));

      // Push the structured data into the final result array
      location1stLevels.push({
        subordinates: subordinatesInfo,
      });
    }

    // Send the successful response
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { topLevelOffices: location1stLevels },
          "First-level locations retrieved successfully"
        )
      );
  } catch (error) {
    // Handle any unexpected errors
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

const getLocationsSubLevels = asyncHandler(async (req, res) => {
  try {
    const officeId = req.params.officeId;

    // Validate if officeId is provided
    if (!officeId) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "Office ID is not provided in the request parameters"
          )
        );
    }

    // Fetch the office by ID
    const office = await Office.findById(officeId);

    // Validate if the office exists
    if (!office) {
      return res
        .status(404)
        .json(
          new ApiResponse(
            404,
            {},
            "Office does not exist for the provided details"
          )
        );
    }

    // Retrieve the details of subordinates based on the IDs in the subordinates array
    const subordinates = await Office.find({
      _id: { $in: office.subordinates },
    });

    // Map the subordinate offices to include only the ID and name
    const subordinatesInfo = subordinates.map((sub) => ({
      id: sub._id,
      officeLocation: sub.officeLocation,
    }));

    // Send the successful response with the subordinates' details
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { subordinates: subordinatesInfo },
          "Sub-level locations retrieved successfully"
        )
      );
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json(
        new ApiResponse(
          500,
          {},
          "An error occurred while processing your request"
        )
      );
  }
});

export { getConsumptionLevel, getLocation1stLevels, getLocationsSubLevels };
