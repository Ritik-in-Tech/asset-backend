import { Asset } from "../../models/asset.model.js";
import moment from "moment-timezone";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { UsageHistory } from "../../models/usagehistory.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

const getUsageHistory = asyncHandler(async (req, res) => {
  try {
    const assetId = req.params.assetId;

    if (!assetId) {
      return res
        .status(400)
        .json(new ApiResponse(400, {}, "Asset ID is required"));
    }

    const usageHistoryDetails = await UsageHistory.findOne({
      assetID: assetId,
    });

    if (!usageHistoryDetails) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            400,
            {},
            "Provided asset does not have any usage histories"
          )
        );
    }

    // Group stateDetails by date
    const groupedByDate = usageHistoryDetails.stateDetails.reduce(
      (acc, detail) => {
        const date = moment(detail.time)
          .tz("Asia/Kolkata")
          .format("YYYY-MM-DD");
        const time = moment(detail.time).tz("Asia/Kolkata").format("HH:mm");

        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push({ state: detail.state, time: time });

        return acc;
      },
      {}
    );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          groupedByDate,
          "Usage history retrieved successfully"
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
          "An error occurred while retrieving usage history"
        )
      );
  }
});

export { getUsageHistory };
