import { Schema, model } from "mongoose";
import {
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

const operatorSchema = new Schema(
  {
    operatorName: commonStringConstraints,
    operatorId: {
      type: Schema.Types.ObjectId,
    },
  },
  {
    _id: false,
  }
);

const createdByAsset = new Schema(
  {
    createdByName: commonStringConstraints,
    adminId: {
      type: Schema.Types.ObjectId,
    },
  },
  {
    _id: false,
  }
);

// const officeAssignedSchema = new Schema(
//   {
//     name: commonStringConstraints,
//     officeId: {
//       type: Schema.Types.ObjectId,
//     },
//   },
//   {
//     _id: false,
//   }
// );

const assetSchema = new Schema({
  assetType: {
    type: String,
    enum: ["Fixed", "Moving"],
    required: true,
  },
  businessId: {
    type: Schema.Types.ObjectId,
  },
  name: commonStringConstraints,
  capacity: commonStringConstraints,
  operator: [operatorSchema],
  modelNumber: {
    type: String,
    required: true,
  },
  consumptionType: {
    type: String,
    required: true,
  },
  consumptionRate: {
    type: Number,
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
  createdBy: [createdByAsset],
  equipmentType: commonStringConstraints,
});

const Asset = model("Assets", assetSchema);
export { Asset };
