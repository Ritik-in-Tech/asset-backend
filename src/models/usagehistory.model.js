import { Schema, model } from "mongoose";
import moment from "moment-timezone";
import { commonStringConstraints } from "../utils/helpers/schema.helper.js";

function convertToIST(date) {
  return moment(date).tz("Asia/Kolkata").toDate();
}

const stateInformationSchema = new Schema(
  {
    state: {
      type: String,
    },
    time: {
      type: Date,
      default: Date.now,
      get: convertToIST,
      set: convertToIST,
    },
    imageUrl: commonStringConstraints,
  },
  {
    _id: false,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

const usageHistorySchema = new Schema(
  {
    createdDate: {
      type: Date,
      default: Date.now,
      get: convertToIST,
      set: convertToIST,
    },
    stateDetails: [stateInformationSchema],
    assetID: {
      type: Schema.Types.ObjectId,
    },
    businessId: {
      type: Schema.Types.ObjectId,
    },
  },
  {
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

usageHistorySchema.pre("save", function (next) {
  if (this.createdDate) {
    this.createdDate = convertToIST(this.createdDate);
  }
  if (this.stateDetails && Array.isArray(this.stateDetails)) {
    this.stateDetails.forEach((item) => {
      if (item.time) {
        item.time = convertToIST(item.time);
      }
    });
  }
  next();
});

const UsageHistory = model("UsageHistory", usageHistorySchema);

export { UsageHistory };
