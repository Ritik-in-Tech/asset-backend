import mongoose from "mongoose";

export function generateUniqueCode(existingBusinessCodes) {
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

export const convertToMongoIds = (stringIds) => {
  return stringIds.map((id) => new mongoose.Types.ObjectId(id));
};

export const convertToStringIds = (mongoIds) => {
  return mongoIds.map((id) => id.toString());
};

export function removeDuplicates(listOfIssues) {
  // Create a Set to store unique items
  const uniqueIssues = new Set(listOfIssues);

  // Convert Set back to an array
  const uniqueArray = [...uniqueIssues];

  return uniqueArray;
}
