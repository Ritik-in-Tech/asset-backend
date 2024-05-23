import mongoose from "mongoose";
export let dbInstance = undefined;
const connectDb = async () => {
  try {
    const connectionString = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASS}@cluster0.zba4uok.mongodb.net/`;
    const connectionInstance = await mongoose.connect(connectionString);
    dbInstance = connectionInstance;
    console.log(
      `\n☘️  MongoDB Connected! Db host: ${connectionInstance.connection.host}\n`
    );
  } catch (error) {
    console.log("MONGODB connection FAILED ", error);
    process.exit(1);
  }
};

export { connectDb };
