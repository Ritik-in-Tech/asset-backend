import { Schema, model } from "mongoose";
import {
  contactNumberSchema,
  commonStringConstraints,
  commonDateConstraints,
} from "../utils/helpers/schema.helper.js";

const assetSchema = new Schema({
  assetType: {
    type: String,
    enum: ["Fixed", "Moving"],
    required: true,
  },
  name: commonStringConstraints,
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
});

const Asset = model("Assets", assetSchema);
export { Asset };
