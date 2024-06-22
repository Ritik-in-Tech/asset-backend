import aws from "aws-sdk";

import ApiError from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import catchAsync from "../../utils/catchAsync.js";

const s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
});

const uploadDocument = catchAsync(async (req, res, next) => {
  try {
    if (!req || !req.files || !req.files.file || !req.files.file.length < 0) {
      return next(new ApiError("File is not provided", 500));
    }

    const file = req.files.file[0];
    if (!file) {
      return next(new ApiError("File is not specidfied", 401));
    }
    if (!req.body || !req.body.folder) {
      return next(new ApiError("Folder is not specidfied", 401));
    }
    const folder = req.body.folder;
    const allowedfolders = ["chats", "businessprofile", "userprofile"];
    if (!allowedfolders.includes(folder)) {
      return next(
        new ApiError(
          `Invalid folder value. Allowed values are "chats", "businessprofile", and "userprofile"`,
          401
        )
      );
    }
    let uploadFolder = "chats";
    if (folder == "chats") {
      uploadFolder = "chats";
    } else if (folder == "businessprofile") {
      uploadFolder = "business-profiles";
    } else if (folder == "userprofile") {
      uploadFolder = "user-profiles";
    } else {
      return next(
        new ApiError(
          `Invalid folder value. Allowed values are "chats", "businessprofile", and "userprofile"`,
          401
        )
      );
    }
    const params = {
      Bucket: `asset-intern-bucket/${uploadFolder}`,
      Key: `${Date.now()}-${Math.random().toString(36).substring(7)}-${
        file.originalname
      }`,
      Body: file.buffer,
    };
    s3.upload(params, (err, data) => {
      if (err) {
        console.error("Error while uploading file to S3:", err);
        return next(new ApiError("Failed to upload file", 401));
      } else {
        const fileUrl = data.Location;
        console.log(`File uploaded successfully at ${fileUrl}`);

        return res.status(200).json(new ApiResponse(200, { fileUrl }));
      }
    });
  } catch (error) {
    console.error("Error while uploading document:", error);
    next(new ApiError("Failed to upload document", 401));
    return res
      .status(500)
      .json(new ApiResponse(500, { error }, "Internal Server error"));
  }
});

export default uploadDocument;
