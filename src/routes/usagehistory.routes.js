import { Router } from "express";
import {
  addUsageHistory,
  getConsumptionDataSpecificAsset,
  getUsageHistory,
} from "../controllers/usagehistory/addusagehistory.controller.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

// router.use(verifyJWT);
// router to add the usage History
router.route("/add-usage-history/:assetId/:businessId").post(addUsageHistory);

router.route("/get-usage-history/:assetId").get(getUsageHistory);

router
  .route("/get-consumption-specific-asset/:assetId")
  .get(getConsumptionDataSpecificAsset);

export default router;
