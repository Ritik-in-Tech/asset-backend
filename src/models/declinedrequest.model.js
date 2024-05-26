import { Schema, model } from "mongoose";

import { getCurrentIndianTime } from "../utils/helpers/time.helper.js";

const declinedRequestSchema = new Schema({
  // This business id defines that request belong to which business
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

  reason: {
    type: String,
    trim: true,
    default: "",
    required: true,
  },

  declinedDate: {
    type: Date,
    default: getCurrentIndianTime(),
  },

  declinedBy: {
    name: {
      type: String,
      trim: true,
      default: "",
    },
    id: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
});

const Declinedrequests = model("Declinedrequests", declinedRequestSchema);
export { Declinedrequests };
