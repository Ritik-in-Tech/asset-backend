import { Schema, model } from "mongoose";
import { commonStringConstraints } from "../utils/helpers/schema.helper.js";

const consumptionData = new Schema(
  {
    consumptionType: commonStringConstraints,
    consumptionRate: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: false,
  }
);

const equipmentData = new Schema(
  {
    equipmentType: commonStringConstraints,
    equipmentRate: {
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
    ref: "Business",
  },
  consumption: [consumptionData],
  equipment: [equipmentData],
});

const Settings = model("Settings", settingsSchema);
export { Settings };
