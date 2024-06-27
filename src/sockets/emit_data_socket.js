let issueNsp;

export function initializeDataSocket(io) {
  try {
    console.log("***** Io RealtimData started *****");

    issueNsp = io.of("/home/sockets");

    issueNsp.on("connection", (socket) => {
      console.log("User Connected: ", socket.id);

      socket.on("user-joined", (username) => {
        socket.username = username;
        console.log(`User connected on home page: ${username}`);
        socket.join(username);
      });

      socket.on("disconnect", () => {
        console.log("User Disconnected", socket.id);
        const rooms = Object.keys(socket.rooms);
        rooms.forEach((room) => {
          socket.leave(room);
          console.log(`User left room ${room}`);
        });
      });
    });

    return issueNsp;
  } catch (error) {
    console.error("Error initializing activity socket:", error);
    throw error;
  }
}

export async function emitRealtimeData(userId, eventData) {
  console.log(eventData);
  if (issueNsp) {
    if (!userId || !eventData) {
      return;
    }
    issueNsp.to(userId).emit("realtime-data", eventData);
  }
}
