import { Router } from "express";
import { createAsset } from "../controllers/assets/createasset.controller.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { getAllAssets } from "../controllers/assets/getallassets.controller.js";

const router = Router();
// this verify that the authenticated user is creating asset
router.use(verifyJWT);
// create asset route
router.route("/create-asset").post(createAsset);

// route to get all the assets
router.route("/get-all-assets").get(getAllAssets);

export default router;
