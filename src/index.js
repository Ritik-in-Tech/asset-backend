// import express from "express";
import https from "https";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import app from "./server.js";
// import { server } from "./server.js";
import { connectDb } from "./db/index.js";

dotenv.config();

const majorNodeVersion = +process.env.NODE_VERSION?.split(".")[0] || 0;

// const PORT = process.env.PORT || 4000;

// Get the current directory name from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sslKeyPath = path.join(__dirname, "../localhost.key");
const sslCertPath = path.join(__dirname, "../localhost.crt");

const privateKey = fs.readFileSync(sslKeyPath, "utf8");
const certificate = fs.readFileSync(sslCertPath, "utf8");

const options = {
  key: privateKey,
  cert: certificate,
};

http.createServer(app).listen(process.env.HTTP_PORT || 80, () => {
  console.log(`HTTP Server is running on port ${process.env.HTTP_PORT || 80}`);
});

https.createServer(options, app).listen(process.env.HTTPS_PORT || 443, () => {
  console.log(
    `HTTPS Server is running on port ${process.env.HTTPS_PORT || 443}`
  );
});

async function initializeServer() {
  if (majorNodeVersion >= 14) {
    try {
      await connectDb();
      console.log("Database connected successfully");
      // No need to call startServer, as servers are already started above.
    } catch (err) {
      console.log("MongoDB connection error: ", err);
    }
  } else {
    connectDb()
      .then(() => {
        console.log("Database connected successfully");
        // No need to call startServer, as servers are already started above.
      })
      .catch((err) => {
        console.log("MongoDB connection error: ", err);
      });
  }
}
initializeServer();
