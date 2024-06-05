import https from "https";
import { User } from "../models/user.model.js";

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
