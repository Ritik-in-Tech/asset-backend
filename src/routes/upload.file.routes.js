import { Router } from "express";
import multer from "multer";
import uploadDocument from "../controllers/uploadfiles/uploadfiles.controller.js";
const upload = multer();

const router = Router();
router
  .route("/upload/file")
  .post(upload.fields([{ name: "file" }, { name: "folder" }]), uploadDocument);
export default router;
