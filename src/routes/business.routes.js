import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { createBusiness } from "../controllers/business/createbusiness.controller.js";
import { updateBusinessDetails } from "../controllers/business/updatebusiness.controller.js";
const router = Router();

router.use(verifyJWT);

// create join business
router.route("/create-business").post(createBusiness);

// update business details
router
  .route("/update-business-deatils/:businessId")
  .patch(updateBusinessDetails);
export default router;
