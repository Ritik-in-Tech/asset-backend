let issueNsp;

export function initializeDataSocket(io) {
  try {
    console.log("***** Io RealtimData started *****");

    issueNsp = io.of("/home/sockets");

    issueNsp.on("connection", (socket) => {
      console.log("User Connected: ", socket.id);

      socket.on("user-joined", (username) => {
        if (typeof username === "string") {
          socket.username = username;
          console.log(`User connected on home page: ${username}`);
          socket.join(username);
        } else if (typeof username === "object" && username !== null) {
          console.error(
            "Received an object instead of a string for username:",
            username
          );
          // Handle this case appropriately
        } else {
          console.error("Received an invalid username:", username);
          // Handle this case appropriately
        }
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
