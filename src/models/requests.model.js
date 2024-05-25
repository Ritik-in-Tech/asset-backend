import { Schema, model } from "mongoose";
import { getCurrentIndianTime } from "../utils/helpers/time.helper.js";

const requestSchema = new Schema({
  businessId: {
    type: Schema.Types.ObjectId,
    required: [true, "Please provide a business id"],
  },
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  name: {
    type: String,
    trim: true,
    default: "",
    required: true,
  },
  contactNumber: {
    countryCode: {
      type: String,
      trim: true,
      default: "",
      required: true,
    },
    number: {
      type: String,
      trim: true,
      default: "",
      match: [
        /^\+?(\d{1,4})?[\s(-]?\(?(\d{3})\)?[-\s]?(\d{3})[-\s]?(\d{4})$/,
        "Please provide a valid phoneNumber",
      ],
    },
  },
  date: {
    type: Date,
    default: getCurrentIndianTime(),
  },
});

const Requests = model("Requests", requestSchema);
export { Requests };
