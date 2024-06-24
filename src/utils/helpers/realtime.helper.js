import { asyncHandler } from "../asyncHandler.js";

const createRealtimeDataSender = (getData) => {
  return asyncHandler(async (req, res) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const sendData = async () => {
      try {
        const data = await getData();
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (error) {
        console.error("Error getting data:", error);
        res.write(
          `data: ${JSON.stringify({ error: "Error fetching data" })}\n\n`
        );
      }
    };

    // Send data immediately
    await sendData();

    // Send data every 500 milliseconds
    const intervalId = setInterval(sendData, 500);

    // Clean up on client disconnect
    req.on("close", () => {
      clearInterval(intervalId);
    });
  });
};

export default createRealtimeDataSender;
