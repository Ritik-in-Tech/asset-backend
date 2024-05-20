import express, { json, urlencoded } from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { connectDb } from "./database/index.js";
dotenv.config();

const app = express();

app.use(json({ limit: "16kb" }));
app.use(urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());
const port = process.env.PORT || 1000;

connectDb()
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(port, () => {
      console.log(`Asset API server is running on port ${port}`);
    });
  })
  .catch((error) => {
    console.log(error);
  });

app.get("/", (req, res) => {
  res.json({ message: "Welcome to Asset-Monitoring API" });
});

export default app;
