import { Router } from "express";
import {
  addUsageHistory,
  getRealtimeDataSpecificAsset,
} from "../controllers/usagehistory/addusagehistory.controller.js";
import {
  getConsumptionDataSpecificAssetToday,
  getConsumptionDataSpecificAssetTodayPerHour,
  getConsumptionDataSpecificAssetPerMinute,
  getConsumptionDataSpecificAssetSpecificDay,
  getConsumptionSpecificAssetLastNDay,
  getConsumptionDataSpecificAssetLastNHour,
  getCosnumptionSpecificAssetMTD,
} from "../controllers/usagehistory/getconsumptionspecifciasset.controller.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { getUsageHistory } from "../controllers/usagehistory/getusagehistory.controller.js";
import {
  getBusinessConsumptionDataSpecificDay,
  getBusinessConsumptionDataToday,
  getBusinessConsumptionDataTodayPerHour,
  getBusinessConsumptionDataTodayPerMin,
  getBusinessConsumptionLastnDays,
  getBusinessConsumptionLastNHours,
  getBusinessConsumptionMTD,
} from "../controllers/usagehistory/getbusinessconsumptiondata.controller.js";

const router = Router();

router.use(verifyJWT);
router.route("/add-usage-history/:assetId/:businessId").post(addUsageHistory);

router.route("/get-usage-history/:assetId").get(getUsageHistory);

router
  .route("/get-consumption-specific-asset-minute/:assetId")
  .get(getConsumptionDataSpecificAssetPerMinute);

router
  .route("/get-consumption-specific-asset-hour/:assetId")
  .get(getConsumptionDataSpecificAssetTodayPerHour);

router
  .route("/get-consumption-specific-asset-today/:assetId")
  .get(getConsumptionDataSpecificAssetToday);

router
  .route("/get-business-consumption-data-today/:businessId")
  .post(getBusinessConsumptionDataToday);

router
  .route("/get-business-consumption-data-perminute/:businessId")
  .post(getBusinessConsumptionDataTodayPerMin);

router
  .route("/get-realtime-data-asset/:assetId")
  .get(getRealtimeDataSpecificAsset);

router
  .route("/get-business-consumption-perhour/:businessId")
  .post(getBusinessConsumptionDataTodayPerHour);

router
  .route("/get-business-consumtion-specificday/:businessId")
  .post(getBusinessConsumptionDataSpecificDay);

router
  .route("/get-business-consumption-lastNDays/:businessId/:nthDays")
  .post(getBusinessConsumptionLastnDays);

router
  .route("/get-consumption-specific-asset-specificday/:assetId")
  .get(getConsumptionDataSpecificAssetSpecificDay);

router
  .route("/get-consumption-specificasset-last-Ndays/:assetId/:nthDays")
  .get(getConsumptionSpecificAssetLastNDay);

router
  .route("/get-consumption-specificasset-last-nHours/:assetId/:hour")
  .get(getConsumptionDataSpecificAssetLastNHour);

router
  .route("/get-business-consumption-lastNhours/:businessId/:hours")
  .post(getBusinessConsumptionLastNHours);

router
  .route("/get-business-consumption-MTD/:businessId")
  .post(getBusinessConsumptionMTD);

router
  .route("/get-business-specific-asset-MTD/:assetId")
  .get(getCosnumptionSpecificAssetMTD);

export default router;
