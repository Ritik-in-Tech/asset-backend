import mongoose from "mongoose";

const connectDb = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASS}@software1.gptczdh.mongodb.net/asset-monitoring?retryWrites=true&w=majority&appName=software1`
    );
    // console.log(
    //   `\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`
    // );
  } catch (error) {
    console.log("MONGODB connection FAILED ", error);
    process.exit(1);
  }
};

export { connectDb };
