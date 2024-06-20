import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { addSettingsData } from "../controllers/settings.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/create-settings/:businessId").post(addSettingsData);
export default router;
