import { Schema, model } from "mongoose";
import { commonStringConstraints } from "../utils/helpers/schema.helper.js";

const assetSchema = new Schema(
  {
    name: commonStringConstraints,
    serialNumber: commonStringConstraints,
    assetId: {
      type: Schema.Types.ObjectId,
    },
  },
  {
    _id: false,
  }
);

const officeSchema = new Schema(
  {
    name: commonStringConstraints,
    officeId: {
      type: Schema.Types.ObjectId,
    },
  },
  {
    _id: false,
  }
);

const businessCategories = new Schema(
  {
    name: commonStringConstraints,
  },
  {
    _id: false,
  }
);

const assetCategoriesSchema = new Schema(
  {
    name: commonStringConstraints,
  },
  {
    _id: false,
  }
);

const businessSchema = new Schema({
  businessCode: {
    type: String,
    required: true,
    unique: true,
    validate: {
      validator: function (value) {
        return /^[0-9A-Z]{6}$/.test(value);
      },
      message: (props) =>
        `${props.value} is not a valid six-digit alphanumeric code!`,
    },
  },
  name: commonStringConstraints,
  logo: {
    type: String,
  },
  industryType: commonStringConstraints,
  city: commonStringConstraints,
  country: commonStringConstraints,
  businessCategory: [businessCategories],
  targets: [
    {
      type: Schema.Types.ObjectId,
      ref: "Target",
    },
  ],
  assets: [assetSchema],
  offices: [officeSchema],
  assetCategory: [assetCategoriesSchema],
});

const Business = model("Business", businessSchema);

export { Business };
