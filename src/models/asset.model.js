import { Schema, model } from "mongoose";
import {
  contactNumberSchema,
  commonStringConstraints,
  commonDateConstraints,
} from "../utils/helpers/schema.helper.js";

const maintainenaceSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    maintenanceId: { type: Schema.Types.ObjectId },
  },
  {
    _id: false,
  }
);

const usageHistorySchema = new Schema(
  {
    usageHistoryId: {
      type: Schema.Types.ObjectId,
    },
  },
  {
    _id: false,
  }
);
const assetSchema = new Schema({
  assetType: {
    type: String,
    enum: ["Fixed", "Moving"],
    required: true,
  },
  name: commonStringConstraints,
  capacity: commonStringConstraints,
  operatorName: commonStringConstraints,
  serialNumber: {
    type: String,
    required: true,
  },
  purchaseDate: commonDateConstraints,
  purchaseAmount: commonStringConstraints,
  expiryDate: commonDateConstraints,
  image: {
    type: String,
  },
  invoice: {
    type: String,
  },
  maintainenace: [maintainenaceSchema],
  usageHistory: [usageHistorySchema],
});

const Asset = model("Assets", assetSchema);
export { Asset };
