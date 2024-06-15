import { Schema, model } from "mongoose";
import {
  contactNumberSchema,
  commonStringConstraints,
} from "../utils/helpers/schema.helper.js";

const businessSchema = new Schema(
  {
    name: commonStringConstraints,
    userType: {
      type: String,
      enum: ["Insider", "Outsider"],
      required: true,
    },
    businessId: {
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
const userSchema = new Schema({
  name: commonStringConstraints,
  jobTitle: commonStringConstraints,
  avatar: {
    type: String,
  },
  contactNumber: contactNumberSchema,
  business: [businessSchema],
  notificationViewCounter: {
    default: 0,
    type: Number,
  },
  email: {
    type: String,
    trim: true,
    default: "",
    match: [/\S+@\S+\.\S+/, "Please provide a valid email address"],
  },
  fcmToken: {
    type: String,
  },
  offices: [officeSchema],
});

const User = model("Users", userSchema);
export { User };
