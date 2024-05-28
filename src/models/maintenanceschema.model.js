import { Schema, model } from "mongoose";
import {
  commonDateConstraints,
  commonStringConstraints,
} from "../utils/helpers/schema.helper.js";

const maintenanceSchema = new Schema({
  assetType: {
    type: String,
    enum: ["Fixed", "Moving"],
    required: true,
  },
  name: commonStringConstraints,
  yearOfService: commonStringConstraints,
  nextServiceDate: {
    type: Date,
  },
  nextInsuranceDate: {
    type: Date,
  },
  createdDate: {
    type: Date,
    default: Date.now,
  },
});

const Maintenance = model("Maintenance", maintenanceSchema);
export { Maintenance };
