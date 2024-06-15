import { Schema, model } from "mongoose";
import { commonStringConstraints } from "../utils/helpers/schema.helper.js";

const officeSchema = new Schema({
  businessId: {
    type: Schema.Types.ObjectId,
  },
  officeName: commonStringConstraints,
  officeCity: commonStringConstraints,
  officeState: commonStringConstraints,
  officeDirection: commonStringConstraints,
});

const Office = model("Office", officeSchema);
export { Office };
