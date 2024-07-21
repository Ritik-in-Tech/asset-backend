import express from "express";
import cookieParser from "cookie-parser";
import session from "express-session";
import cors from "cors";
import bodyParser from "body-parser";
import { Server } from "socket.io";
import morgan from "morgan";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import YAML from "yaml";
import sdk from "api";
const sdkInstance = sdk("@msg91api/v5.0#6n91xmlhu4pcnz");
import http from "http";
import https from "https";
import { connectDb } from "./db/index.js";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sslKeyPath = process.env.SSL_KEY_PATH;
const sslCertPath = process.env.SSL_CERT_PATH;

const projectRoot = path.resolve(__dirname, "..");
const fullSslKeyPath = path.join(projectRoot, sslKeyPath);
const fullSslCertPath = path.join(projectRoot, sslCertPath);

let privateKey, certificate;
try {
  privateKey = fs.readFileSync(fullSslKeyPath, "utf8");
  // console.log("The private key is: ", privateKey);
  certificate = fs.readFileSync(fullSslCertPath, "utf8");
  // console.log("The certificate is: ", certificate);
} catch (error) {
  console.error("Error reading SSL files:", error);
  throw error;
}

const options = {
  key: privateKey,
  cert: certificate,
};

const file = fs.readFileSync(
  path.resolve(__dirname, "../swagger.yaml"),
  "utf8"
);
// const swaggerDocument = YAML.parse(file);

import { initializeNotificationSocket } from "./sockets/notification_socket.js";

const app = express();

// Middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Global middlewares
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(bodyParser.json()); // Parse incoming JSON data
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());
app.use(
  session({
    secret: process.env.EXPRESS_SESSION_SECRET || "your-secret-key",
    resave: true,
    saveUninitialized: true,
  })
);

// Import and use all the routes
import authRoutes from "./routes/authentication.routes.js";
import userRoutes from "./routes/user.routes.js";
import businessRoutes from "./routes/business.routes.js";
import assetRoutes from "./routes/asset.routes.js";
import maintenaceRoutes from "./routes/maintenance.routes.js";
import usageHistoryRoutes from "./routes/usagehistory.routes.js";
import uploadDocumentRoutes from "./routes/upload.document.routes.js";
import uploadfileAWSRoutes from "./routes/upload.file.routes.js";
import officeRoutes from "./routes/office.routes.js";
import settingRoutes from "./routes/settings.routes.js";

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/business", businessRoutes);
app.use("/api/v1/asset", assetRoutes);
app.use("/api/v1/maintenance", maintenaceRoutes);
app.use("/api/v1/usage", usageHistoryRoutes);
app.use("/api/v1", uploadDocumentRoutes);
app.use("/api/v1", uploadfileAWSRoutes);
app.use("/api/v1/office", officeRoutes);
app.use("/api/v1/settings", settingRoutes);

// Catch-all route for undefined routes
app.get("*", (req, res) => {
  res.json({
    message:
      "Welcome to Asset Monitoring API. To see all APIs, please visit this URL: ",
  });
});

const HTTP_PORT = process.env.HTTP_PORT || 80;
const HTTPS_PORT = process.env.HTTPS_PORT || 443;
const startServer = async () => {
  try {
    await connectDb();

    const httpServer = http.createServer(app);

    const httpsServer = https.createServer(options, app);

    const ioHttp = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    const ioHttps = new Server(httpsServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    initializeNotificationSocket(ioHttp);
    // initializeNotificationSocket(ioHttps);

    httpServer.listen(HTTP_PORT, () => {
      console.log(`HTTP Server running on http://localhost:${HTTP_PORT}`);
    });

    httpsServer.listen(HTTPS_PORT, () => {
      console.log(`HTTPS Server running on https://localhost:${HTTPS_PORT}`);
    });
  } catch (error) {
    console.error("Failed to start the server:", error);
    process.exit(1);
  }
};

startServer();
