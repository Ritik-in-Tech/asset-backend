import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { createOffice } from "../controllers/office/create.office.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/create-office/:businessId").post(createOffice);

export default router;
