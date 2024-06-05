import { Router } from "express";
import multer from "multer";
import mongoose from "mongoose";

import { Schema } from "mongoose";
const router = Router();

// define document schema
const documentSchema = new Schema({ data: Buffer, contentType: String });

const Document = mongoose.model("Document", documentSchema);

// Multer configuration
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post("/upload", upload.single("document"), async (req, res, next) => {
  console.log("POST /upload called"); // Add this line
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No document provided" });
    }
    const document = new Document({
      data: req.file.buffer,
      contentType: req.file.mimetype,
    });
    const savedDocument = await document.save();
    const documentUrl = `http://13.200.156.125:3000/api/v1/documents/${savedDocument._id}`;
    res.json({ statusCode: 200, documentUrl: documentUrl });
  } catch (error) {
    next(error);
  }
});

router.get("/documents/:documentId", async (req, res, next) => {
  console.log("GET /documents/:documentId called"); // Add this line
  try {
    const documentId = req.params.documentId;
    if (!documentId) {
      return res
        .status(400)
        .json({ error: "Please provide document Id in params" });
    }
    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.set("Content-Type", document.contentType);
    res.send(document.data);
  } catch (error) {
    next(error);
  }
});

router.get("/download/:documentId", async (req, res, next) => {
  console.log("GET /download/:documentId called"); // Add this line
  try {
    const documentId = req.params.documentId;
    if (!documentId) {
      return res
        .status(400)
        .json({ error: "Please provide document Id in params" });
    }
    const document = await Document.findById(documentId);

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }
    let fileExtension = "";
    switch (document.contentType) {
      case "application/pdf":
        fileExtension = "pdf";
        break;
      case "image/jpeg":
        fileExtension = "jpg";
        break;
      case "image/png":
        fileExtension = "png";
        break;
      case "image/gif":
        fileExtension = "gif";
        break;
      case "image/bmp":
        fileExtension = "bmp";
        break;
      case "application/msword":
        fileExtension = "doc";
        break;
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        fileExtension = "docx";
        break;
      case "application/vnd.ms-excel":
        fileExtension = "xls";
        break;
      case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        fileExtension = "xlsx";
        break;
      case "application/vnd.ms-powerpoint":
        fileExtension = "ppt";
        break;
      case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        fileExtension = "pptx";
        break;
      case "text/plain":
        fileExtension = "txt";
        break;
      case "application/zip":
        fileExtension = "zip";
        break;
      case "application/x-rar-compressed":
        fileExtension = "rar";
        break;
      case "application/vnd.rar":
        fileExtension = "rar";
        break;
      case "application/octet-stream":
        fileExtension = "dat";
        break;
      case "application/json":
        fileExtension = "json";
        break;
      case "application/xml":
        fileExtension = "xml";
        break;
      case "application/vnd.android.package-archive":
        fileExtension = "apk";
        break;
      default:
        fileExtension = "dat"; // Default extension if content type is unknown
    }
    const filename = `${documentId}.${fileExtension}`;
    res.set("Content-Disposition", `attachment; filename="${filename}"`);
    res.set("Content-Type", document.contentType || "application/octet-stream");
    res.send(document.data);
  } catch (error) {
    next(error);
  }
});

export default router;
