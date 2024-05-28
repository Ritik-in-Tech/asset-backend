import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { addMaintenanceDetails } from "../controllers/maintenance/addmaintenance.controller.js";

const router = Router();

// route protect to use jwt
router.use(verifyJWT);

// add maintenance details for the asset
router
  .route("/add-maintenance-details/:serialNumber")
  .post(addMaintenanceDetails);

export default router;
