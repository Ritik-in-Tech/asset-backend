import { Asset } from "../../models/asset.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { Business } from "../../models/business.model.js";
import { BusinessUsers } from "../../models/businessusers.model.js";
import { UsageHistory } from "../../models/usagehistory.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { getCurrentIndianTime } from "../../utils/helpers/time.helper.js";

const addUsageHistory = asyncHandler(async (req, res) => {
  try {
    const { state } = req.body;
    const assetId = req.params.assetId;

    if (!assetId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Asset ID is required"));
    }

    const asset = await Asset.findById(assetId);

    if (!asset) {
      return res.status(404).json(new ApiResponse(404, {}, "Asset not found"));
    }

    // Fetch the latest usage history for the asset
    let latestUsageHistory = await UsageHistory.findOne({
      assetID: assetId,
    }).sort({ createdDate: -1 });

    // If usage history exists, check for consecutive states
    if (latestUsageHistory) {
      const latestStateDetail =
        latestUsageHistory.stateDetails[
          latestUsageHistory.stateDetails.length - 1
        ];

      // Check if the latest state is the same as the new state being added
      if (latestStateDetail.state === state) {
        return res
          .status(400)
          .json(
            new ApiResponse(400, {}, "Consecutive states cannot be the same")
          );
      }

      // Add the new state detail to the existing usage history
      latestUsageHistory.stateDetails.push({ state: state, time: new Date() });
      await latestUsageHistory.save();

      return res
        .status(201)
        .json(
          new ApiResponse(
            201,
            latestUsageHistory,
            "Usage history updated successfully"
          )
        );
    }

    // If no usage history exists, create a new one
    const newUsageHistory = new UsageHistory({
      stateDetails: [{ state: state, time: new Date() }],
      assetID: assetId,
    });

    // Save the usage history data
    const savedUsageHistory = await newUsageHistory.save();

    // Push the new usage history ID to the asset
    asset.usageHistory.push({ usageHistoryId: savedUsageHistory._id });
    await asset.save();

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          savedUsageHistory,
          "Usage history added successfully"
        )
      );
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json(
        new ApiResponse(500, {}, "An error occurred while adding usage history")
      );
  }
});

export { addUsageHistory };
