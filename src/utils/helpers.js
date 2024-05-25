import fs from "fs";
import path from "path";
import sharp from "sharp";
import mongoose from "mongoose";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getUserAvatarPath = (fileName) => {
  return path.join(__dirname, `../../public/uploads/avatars/${fileName}`);
};

export const getImagePath = (fileName) => {
  return path.join(__dirname, `../../public/images/${fileName}`);
};

const validateMaxArraySize = (array, maxLen) => {
  return array.length <= maxLen;
};

const removePerfImgs = (images) => {
  images.forEach((imgName) => {
    fs.unlinkSync(
      path.join(__dirname, `../../public/uploads/others/${imgName}`)
    );
  });
};

export const getStaticFilePath = (req, fileName) => {
  return `${req.protocol}://${req.get("host")}/images/${fileName}`;
};

export const getLocalPath = (fileName) => {
  return `public/images/${fileName}`;
};

export const removeLocalFile = (localPaths) => {
  if (!Array.isArray(localPaths)) {
    localPaths = [localPaths];
  }

  localPaths.forEach((localPath) => {
    const path = localPath?.path || localPath;

    if (fs.existsSync(path)) {
      fs.unlink(path, (err) => {
        if (err) console.log("Error while removing local files: ", err);
        else {
          console.log("Removed local: ", path);
        }
      });
    }
  });
};

export const moveLocalFile = (src, dest) => {
  if (fs.existsSync(src)) {
    fs.rename(src, dest, (err) => {
      if (err) console.log("Error while removing local files: ", err);
      else {
        console.log("Removed local: ", src);
      }
    });
  }
};

export const getUniqueFileName = (file) => {
  const uniqueFileName = `${file.originalname
    .split(/[;|, ]+/)
    .shift()}-${Date.now()}.${file.originalname.split(".").pop()}`;

  return uniqueFileName;
};

export const validateFiles = (files, mimetype) => {
  files = !Array.isArray(files) ? [files] : files;

  return files.every((file) => file.mimetype.startsWith(mimetype));
};

export const validateFilesCount = (files, maxCount) => {
  return files?.length <= maxCount;
};

export const cropImage = async (file) => {
  const { width, height } = await sharp(file.buffer).metadata();

  const size = Math.min(width, height);

  file.buffer = await sharp(file.buffer)
    .resize(size, size, {
      fit: sharp.fit.cover,
      position: sharp.strategy.attention,
    })
    .webp({ quality: 20 })
    .toBuffer();

  return file;
};

export const saveFile = (file, name) => {
  file.filename = name;
  file.path = getLocalPath(name);

  fs.writeFile(file.path, file.buffer, (error) => {
    if (error) {
      console.log("Error while saving file: ", error);
    }

    delete file.buffer;

    console.log("File Saved: " + file.path);
  });
};

// Helper function to check if a user is an admin
function isAdmin(user) {
  return user.role === "Admin";
}

// Helper function to check if a user is a miniadmin
function isMiniAdmin(user) {
  return user.role === "MiniAdmin";
}

function generateUniqueCode(existingBusinessCodes) {
  const alphanumericChars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // O, 0 , I excluded
  let code;

  while (true) {
    code = "";
    for (let i = 0; i < 6; i++) {
      const randomIndex = Math.floor(Math.random() * alphanumericChars.length);
      code += alphanumericChars.charAt(randomIndex);
    }

    if (!existingBusinessCodes.has(code)) {
      existingBusinessCodes.add(code);
      break;
    }
  }

  return code;
}

function isValidDateFormat(dateString) {
  // Regular expression for dd/mm/yy format
  const regex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{2}$/;

  // Test if the provided string matches the regular expression
  return regex.test(dateString);
}

function createDateFromFormat(dateString) {
  // Regular expression for dd/mm/yy format
  const regex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{2}$/;

  // Test if the provided string matches the regular expression
  if (regex.test(dateString)) {
    // Extract year, month, and day from the string
    const parts = dateString.split("/");
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Subtract 1 as months are zero-based in Date object
    const year = 2000 + parseInt(parts[2], 10); // Assuming years are in the range 2000-2099 (yy format)

    // Create a Date object
    return new Date(year, month, day);
  } else {
    return null; // Return null for invalid date strings
  }
}

function formatDateToddmmyy(inputDate) {
  // Define regular expressions to match different date formats
  const regex_dd_mm_yyyy = /^\d{2}\/\d{2}\/\d{4}$/;
  const regex_dd_mm_yy = /^\d{2}\/\d{2}\/\d{2}$/;
  const regex_dd_mm_yyyy_dash = /^\d{2}-\d{2}-\d{4}$/;
  const regex_dd_mm_yy_dash = /^\d{2}-\d{2}-\d{2}$/;
  const regex_yyyy_mm_dd = /^\d{4}-\d{2}-\d{2}$/;
  const regex_yy_mm_dd = /^\d{2}-\d{2}-\d{2}$/;

  // Check if the input date matches any of the formats
  if (regex_dd_mm_yyyy.test(inputDate) || regex_yyyy_mm_dd.test(inputDate)) {
    // Convert dd/mm/yyyy or yyyy-mm-dd to dd/mm/yy
    const parts = inputDate.split(/[/\-]/);
    const year = parts[2].slice(-2);
    return `${parts[0]}/${parts[1]}/${year}`;
  } else if (regex_dd_mm_yy.test(inputDate) || regex_yy_mm_dd.test(inputDate)) {
    // Already in the correct format (dd/mm/yy)
    return inputDate;
  } else if (regex_dd_mm_yyyy_dash.test(inputDate)) {
    // Convert dd-mm-yyyy to dd/mm/yy
    const parts = inputDate.split("-");
    const year = parts[2].slice(-2);
    return `${parts[0]}/${parts[1]}/${year}`;
  } else if (regex_dd_mm_yy_dash.test(inputDate)) {
    // Convert dd-mm-yy to dd/mm/yy
    const parts = inputDate.split("-");
    const year = parts[2];
    return `${parts[0]}/${parts[1]}/${year}`;
  } else {
    // Invalid format, return null or throw an error
    return null;
  }
}

// Examples
// console.log(isValidDateFormat("2023-2-5"));   // true
// console.log(isValidDateFormat("2023-02-03"));  // true
// console.log(isValidDateFormat("2023-15-30"));  // false (invalid month)
// console.log(isValidDateFormat("2023-02-32"));  // false (invalid day)
// console.log(isValidDateFormat("2023-02-3"));  // true
// console.log(isValidDateFormat("2023-2-03"));   // true

function groupAndSortIssues(issues) {
  // Group issues by nextFollowUpDate
  const groupedIssues = issues.reduce((result, issue) => {
    const key = issue.nextFollowUpDate; // Use the date string directly
    (result[key] = result[key] || []).push(issue);
    return result;
  }, {});

  // Convert grouped issues to the desired format
  const formattedIssues = Object.keys(groupedIssues).map((key) => ({
    nextFollowUpDate: key,
    issues: groupedIssues[key],
  }));

  // Sort the formatted issues by nextFollowUpDate
  formattedIssues.sort((a, b) =>
    a.nextFollowUpDate.localeCompare(b.nextFollowUpDate)
  );

  return formattedIssues;
}

const formatDate = (date) => {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear().toString();
  return `${year}-${month}-${day}`;
};

function isValidMongoId(str) {
  // Regular expression to match a 24-character hexadecimal string
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;

  // Test if the provided string matches the regular expression
  return objectIdRegex.test(str);
}

function splitMongoId(str) {
  if (!str || typeof str !== "string" || str.indexOf("_") === -1) {
    return null;
  }

  const [userId, businessId] = str.split("_");
  return { userId: userId, businessId: businessId };
}

function isMongoId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function getCurrentIndianTime() {
  // Get current date and time in UTC
  //  let currentDate = new Date();
  //
  //  // Get UTC time in milliseconds
  //  let utcTime = currentDate.getTime();
  //
  //  // Indian Standard Time (IST) is UTC+5:30
  //  let istOffset = 5.5 * 60 * 60 * 1000;
  //
  //  // Convert UTC time to IST time
  //  let istTime = new Date(utcTime + istOffset);

  return new Date();
}
// console.log(getCurrentIndianTime());

const convertToMongoIds = (stringIds) => {
  return stringIds.map((id) => new mongoose.Types.ObjectId(id));
};

const convertToStringIds = (mongoIds) => {
  return mongoIds.map((id) => id.toString());
};

export {
  convertToMongoIds,
  convertToStringIds,
  getCurrentIndianTime,
  formatDateToddmmyy,
  isValidMongoId,
  splitMongoId,
  isMongoId,
  getUserAvatarPath,
  validateMaxArraySize,
  removePerfImgs,
  formatDate,
  isAdmin,
  isMiniAdmin,
  generateUniqueCode,
  isValidDateFormat,
  groupAndSortIssues,
};
