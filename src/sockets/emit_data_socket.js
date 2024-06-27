let issueNsp;

export function initializeDataSocket(io) {
  try {
    console.log("***** Io RealtimData started *****");

    issueNsp = io.of("/home/sockets");

    issueNsp.on("connection", (socket) => {
      console.log("User Connected: ", socket.id);

      socket.on("user-joined", (username) => {
        socket.username = username.toString();
        console.log(`User connected on home page: ${username.toString()}`);
        socket.join(username.toString());
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
  return new Promise((resolve, reject) => {
    if (!issueNsp) {
      reject(new Error("Namespace not initialized"));
      return;
    }

    if (!userId || !eventData) {
      reject(new Error("Invalid userId or eventData"));
      return;
    }

    issueNsp.to(userId.toString()).emit("realtime-data", eventData, (error) => {
      console.log("This is userId", userId.toString());
      if (error) {
        reject(error);
      } else {
        console.log(eventData);
        resolve();
      }
    });
  });
}
