import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { createOffice } from "../controllers/office/create.office.controller.js";
import { getAllOfficeInBusiness } from "../controllers/office/getalloffice.controller.js";
import { getOfficeHierarchy } from "../controllers/office/officehierarchy.controller.js";
import { getConsumptionLevel } from "../controllers/office/getlevels.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/create-office/:businessId").post(createOffice);

router.route("/get-office-details/:businessId").get(getAllOfficeInBusiness);

router.route("/get-office-hierarchy/:businessId").get(getOfficeHierarchy);

router
  .route("/get-consumption-categories/:businessId")
  .get(getConsumptionLevel);

export default router;
