import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import {
  addSettingsBusinessData,
  getSettingsData,
} from "../controllers/settings.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/create-settings/:businessId").post(addSettingsBusinessData);

router.route("/get-settingsData/:businessId").get(getSettingsData);
export default router;
