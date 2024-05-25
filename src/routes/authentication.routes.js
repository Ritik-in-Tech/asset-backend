import { Router } from "express";
import {
  loginWithOTP,
  verifyloginOTP,
} from "../controllers/authentication.controller.js";
const router = Router();

// user register
router.route("/login").post(loginWithOTP);
// login user
router.route("/verify-otp").post(verifyloginOTP);

export default router;
