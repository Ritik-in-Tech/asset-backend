import { Router } from "express";
import {
  addUsageHistory,
  getRealtimeDataSpecificAsset,
} from "../controllers/usagehistory/addusagehistory.controller.js";
import {
  getConsumptionDataSpecificAssetPerDay,
  getConsumptionDataSpecificAssetPerHour,
  getConsumptionDataSpecificAssetPerMinute,
} from "../controllers/usagehistory/getconsumptionspecifciasset.controller.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { getUsageHistory } from "../controllers/usagehistory/getusagehistory.controller.js";
import {
  getBusinessConsumptionDataLast15Days,
  getBusinessConsumptionDataLast7Days,
  getBusinessConsumptionDataPerDay,
  getBusinessConsumptionDataPerHour,
  getBusinessConsumptionDataPerMin,
  getBusinessConsumptionDataSpecificDay,
} from "../controllers/usagehistory/getbusinessconsumptiondata.controller.js";

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
  .get(getBusinessConsumptionDataPerDay);

router
  .route("/get-business-consumption-data-perminute/:businessId")
  .get(getBusinessConsumptionDataPerMin);

router
  .route("/get-realtime-data-asset/:assetId")
  .get(getRealtimeDataSpecificAsset);

router
  .route("/get-business-consumption-perhour/:businessId")
  .get(getBusinessConsumptionDataPerHour);

router
  .route("/get-business-consumption-last7days/:businessId")
  .get(getBusinessConsumptionDataLast7Days);

router
  .route("/get-business-consumtion-specificday/:businessId")
  .get(getBusinessConsumptionDataSpecificDay);

router
  .route("/get-business-consumption-last15days/:businessId")
  .get(getBusinessConsumptionDataLast15Days);

export default router;
