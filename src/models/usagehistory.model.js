import { Schema, model } from "mongoose";
import { getCurrentIndianTime } from "../utils/helpers/time.helper.js";

const stateInformationSchema = new Schema(
  {
    state: {
      type: String,
    },
    time: {
      type: Date,
      default: getCurrentIndianTime,
    },
  },
  {
    _id: false,
  }
);

const usageHistorySchema = new Schema({
  createdDate: {
    type: Date,
    default: Date.now,
  },
  stateDetails: [stateInformationSchema],
  assetID: {
    type: Schema.Types.ObjectId,
  },
});

const UsageHistory = model("UsageHistory", usageHistorySchema);

export { UsageHistory };
