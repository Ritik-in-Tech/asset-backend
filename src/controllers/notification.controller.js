import https from "https";
import { User } from "../models/user.model.js";
import { fileURLToPath } from "url";
import path from "path";
import admin from "firebase-admin";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

export async function sendNotification(userId, body) {
  try {
    // console.log("This is userID " , userId , " this is body : " , body);
    if (!userId || !body) {
      console.log("Provide complete information!!");
      return;
    }

    const userInfo = await User.findOne({ _id: userId });
    console.log(userInfo);

    if (!userInfo.fcmToken) {
      console.log("User have not fcm token!!");
      return;
    }

    let token = userInfo.fcmToken;

    // console.log("Hiii");

    let serverKey = process.env.FCM_API_KEY;

    const data = JSON.stringify({
      to: token,
      notification: {
        title: "Asset Management",
        body: body,
      },
      data: {},
    });

    const options = {
      hostname: "fcm.googleapis.com",
      path: "/fcm/send",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serverKey}`,
      },
    };

    const req = https.request(options, (res) => {
      let responseData = "";
      res.on("data", (chunk) => {
        responseData += chunk;
      });
      res.on("end", () => {
        console.log("Response:", responseData);
      });
    });

    req.on("error", (error) => {
      console.error("Error:", error);
    });

    req.write(data);
    req.end();
  } catch (e) {
    console.error(e.toString());
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceKeyPath = process.env.SERVICE_KEY;

if (!serviceKeyPath) {
  throw new Error("SERVICE_KEY is not set in the environment");
}

const projectRoot = path.resolve(__dirname, "../..");
const fullServiceKeyPath = path.join(projectRoot, serviceKeyPath);

// console.log(fullServiceKeyPath);

// Read and parse the service account file
let serviceAccount;
try {
  const serviceAccountFile = fs.readFileSync(fullServiceKeyPath, "utf8");
  serviceAccount = JSON.parse(serviceAccountFile);
} catch (error) {
  console.error("Error reading service account file:", error);
  throw error;
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
export async function sendNotificationNew(userId, body) {
  try {
    if (!userId || !body) {
      console.log("Provide complete information!!");
      return;
    }

    const userInfo = await User.findOne({ _id: userId });

    if (!userInfo.fcmToken) {
      console.log("User has no fcm token!!");
      return;
    }

    let token = userInfo.fcmToken;
    console.log(token);
    console.log(body);

    const message = {
      token: token,
      notification: {
        title: "AssetCop",
        body: body,
      },
      data: {},
    };

    console.log("Sending notification:", message.notification);
    const response = await admin.messaging().send(message);
    console.log("Successfully sent message:", response);
  } catch (error) {
    console.log("Error sending message:", error);
  }
}
