import { Schema, model } from "mongoose";
import { commonStringConstraints } from "../utils/helpers/schema.helper.js";

const consumptionData = new Schema(
  {
    category: commonStringConstraints,
    consumptionRate: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: false,
  }
);

const settingsSchema = new Schema({
  assetId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "Assets",
  },
  consumption: [consumptionData],
});

const Settings = model("Settings", settingsSchema);
export { Settings };
