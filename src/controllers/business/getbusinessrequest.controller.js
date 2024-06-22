import mongoose from "mongoose";

import { Requests } from "../../models/requests.model.js";

import { ApiResponse } from "../../utils/ApiResponse.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const getBusinessRequests = asyncHandler(async (req, res, next) => {
  try {
    const businessId = req?.params?.businessId;

    if (!businessId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Specify business id!!"));
    }

    let requests = await Requests.find({
      businessId: new mongoose.Types.ObjectId(businessId),
    });

    return res
      .status(200)
      .json(new ApiResponse(200, { requests: requests || [] }, "All requests"));
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(new ApiResponse(500, { error }, "Internal Server Error"));
  }
});

export default getBusinessRequests;
