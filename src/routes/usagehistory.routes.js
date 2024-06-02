import { Router } from "express";
import { addUsageHistory } from "../controllers/usagehistory/addusagehistory.controller.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

// router.use(verifyJWT);
// router to add the usage History
router.route("/add-usage-history/:assetId").post(addUsageHistory);

export default router;
