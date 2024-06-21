import { Schema, model } from "mongoose";
import { commonStringConstraints } from "../utils/helpers/schema.helper.js";

// Schema for individual assets
const assetSchema = new Schema(
  {
    name: commonStringConstraints,
    modelNumber: commonStringConstraints,
    assetId: {
      type: Schema.Types.ObjectId,
    },
  },
  {
    _id: false,
  }
);

// Schema for business categories
// const businessCategoriesSchema = new Schema(
//   {
//     name: commonStringConstraints,
//   },
//   {
//     _id: false,
//   }
// );

// Schema for asset categories
// const assetCategoriesSchema = new Schema(
//   {
//     name: commonStringConstraints,
//   },
//   {
//     _id: false,
//   }
// );

// const cityOfficesSchema = new Schema(
//   {
//     city: commonStringConstraints,
//     offices: [commonStringConstraints],
//   },
//   {
//     _id: false,
//   }
// );

// Main business schema
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
  assets: [assetSchema],
});

const Business = model("Business", businessSchema);

export { Business };
