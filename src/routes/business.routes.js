import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { createBusiness } from "../controllers/business/createbusiness.controller.js";
import { updateBusinessDetails } from "../controllers/business/updatebusiness.controller.js";
import { joinBusiness } from "../controllers/business/joinbusiness.controller.js";
import getBusinessRequests from "../controllers/business/getbusinessrequest.controller.js";
const router = Router();

router.use(verifyJWT);

// create join business
router.route("/create-business").post(createBusiness);

// update business details
router
  .route("/update-business-deatils/:businessId")
  .patch(updateBusinessDetails);

// join business
router.route("/join-business/:businessCode").post(joinBusiness);

// getBusiness request
router.route("/get-business-request").get(getBusinessRequests);
export default router;
