import mongoose from "mongoose";

import { Acceptedrequests } from "../../models/acceptedrequest.model.js";

import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const getBusinessAcceptedRequests = asyncHandler(async (req, res) => {
  try {
    const businessId = req?.params?.businessId;

    if (!businessId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Specify business id!!"));
    }

    let requests = await Acceptedrequests.find({
      businessId: new mongoose.Types.ObjectId(businessId),
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { requests: requests || [] },
          "Accepted requests fetched successfully!"
        )
      );
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(new ApiResponse(500, { error }, "Internal server error!"));
  }
});

export { getBusinessAcceptedRequests };
