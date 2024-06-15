import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { createOffice } from "../controllers/office/create.office.controller.js";
import { getAllOfficeInBusiness } from "../controllers/office/getalloffice.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/create-office/:businessId").post(createOffice);

router.route("/get-office-details/:businessId").get(getAllOfficeInBusiness);

export default router;
