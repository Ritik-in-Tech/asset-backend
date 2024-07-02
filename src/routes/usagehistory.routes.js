import { Router } from "express";
import {
  addUsageHistory,
  getBusinessConsumptionData,
  getRealtimeDataSpecificAsset,
  getUsageHistory,
} from "../controllers/usagehistory/addusagehistory.controller.js";
import {
  getConsumptionDataSpecificAssetPerDay,
  getConsumptionDataSpecificAssetPerHour,
  getConsumptionDataSpecificAssetPerMinute,
} from "../controllers/usagehistory/getconsumptionspecifciasset.controller.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

router.use(verifyJWT);
// router to add the usage History
router.route("/add-usage-history/:assetId/:businessId").post(addUsageHistory);

router.route("/get-usage-history/:assetId").get(getUsageHistory);

router
  .route("/get-consumption-specific-asset-minute/:assetId")
  .get(getConsumptionDataSpecificAssetPerMinute);

router
  .route("/get-consumption-specific-asset-hour/:assetId")
  .get(getConsumptionDataSpecificAssetPerHour);

router
  .route("/get-consumption-specific-asset-perday/:assetId")
  .get(getConsumptionDataSpecificAssetPerDay);

router
  .route("/get-business-consumption-data/:businessId")
  .get(getBusinessConsumptionData);

router
  .route("/get-realtime-data-asset/:assetId")
  .get(getRealtimeDataSpecificAsset);

export default router;
