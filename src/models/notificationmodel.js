import mongoose, { Schema } from "mongoose";
import {} from "../utils/helpers.js";
import { getCurrentUTCTime } from "../utils/helpers/time.helper.js";

const notificationSchema = new Schema({
  userId: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  notificationCategory: {
    type: String, // business , user
    required: true,
  },
  createdDate: {
    type: Date,
    default: getCurrentUTCTime,
  },

  // i dont think it is useful if not necessary in future remove this
  businessName: {
    type: String,
    required: function () {
      return this.notificationCategory == "business";
    },
  },
  businessId: {
    type: String,
    required: function () {
      return this.notificationCategory == "business";
    },
  },
});

export default mongoose.model("notifications", notificationSchema);
