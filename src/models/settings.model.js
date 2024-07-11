import { Schema, model } from "mongoose";
import { commonStringConstraints } from "../utils/helpers/schema.helper.js";

const assetInformation = new Schema(
  {
    fuelType: commonStringConstraints,
    units: commonStringConstraints,
    value: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: false,
  }
);

const settingsSchema = new Schema({
  businessId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  assetInformation: [assetInformation],
});

const Settings = model("Settings", settingsSchema);
export { Settings };
