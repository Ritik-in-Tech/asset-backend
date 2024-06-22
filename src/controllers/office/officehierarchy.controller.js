import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { Business } from "../../models/business.model.js";
import { Office } from "../../models/office.model.js";

const getOfficeHierarchy = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Token is Invalid!!"));
    }
    const businessId = req.params.businessId;
    if (!businessId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Business ID is not provided"));
    }
    const business = await Business.findById(businessId);
    if (!business) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Business not found"));
    }
    const offices = await Office.find(
      { businessId: businessId },
      { subordinates: 1, officeLocation: 1, _id: 1 }
    );

    let nodes = [];
    let edges = [];

    for (const record of offices) {
      let nodeItem = {
        id: record._id.toString(),
        label: {
          office: record.officeLocation,
          officeId: record._id.toString(),
        },
      };
      nodes = [...nodes, nodeItem];

      let subordinates = record.subordinates;
      for (let sub of subordinates) {
        let edgeItem = { from: record._id.toString(), to: sub.toString() };
        edges = [...edges, edgeItem];
      }
    }

    const data = {
      nodes: nodes,
      edges: edges,
    };
    return res
      .status(200)
      .json(new ApiResponse(200, { data }, "Hierarchy fetched successfully"));
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(new ApiResponse(500, { error }, "Internal server error"));
  }
});

export { getOfficeHierarchy };
