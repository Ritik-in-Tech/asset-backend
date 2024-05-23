import express from "express";
import dotenv from "dotenv";
import { server } from "./server.js";
import { connectDb } from "./db/index.js";

dotenv.config();

const majorNodeVersion = +process.env.NODE_VERSION?.split(".")[0] || 0;

const PORT = process.env.PORT || 4000;

const startServer = () => {
  server.listen(PORT, () => {
    console.log("⚙️  Server is running on port: " + PORT);
  });
};

if (majorNodeVersion >= 14) {
  try {
    await connectDb();
    startServer();
  } catch (err) {
    console.log("Mongo db connect error: ", err);
  }
} else {
  connectDb()
    .then(() => {
      startServer();
    })
    .catch((err) => {
      console.log("Mongo db connect error : ", err);
    });
}
