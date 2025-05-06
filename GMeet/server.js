const express = require("express");
const app = express();
const server = require("http").Server(app);
const { v4: uuidv4 } = require("uuid");
const io = require("socket.io")(server);
const { createClient } = require("redis");

// Peer
const { ExpressPeerServer } = require("peer");
const peerServer = ExpressPeerServer(server, {
  debug: true,
  // Add TURN/STUN server configuration for NAT traversal
  config: {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      {
        urls: "turn:numb.viagenie.ca",
        credential: "muazkh",
        username: "webrtc@live.com"
      }
    ]
  }
});

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use("/peerjs", peerServer);

// Initialize Redis Client for Pub/Sub
const REDIS_CHANNELS = {
  ROOM_EVENTS: 'room-events',
  USER_EVENTS: 'user-events',
  MESSAGES: 'messages'
};

// Create separate clients for subscriber and publisher (Redis best practice)
const subClient = createClient();
const pubClient = createClient();

// Error handling for Redis clients
subClient.on('error', (err) => console.error('Redis Subscriber Error', err));
pubClient.on('error', (err) => console.error('Redis Publisher Error', err));

// Connect to Redis and set up subscription
(async () => {
  try {
    // Connect both clients
    await Promise.all([subClient.connect(), pubClient.connect()]);
    console.log('Connected to Redis successfully!');
    
    // Subscribe to channels
    await subClient.subscribe(REDIS_CHANNELS.ROOM_EVENTS, handleRoomEvent);
    await subClient.subscribe(REDIS_CHANNELS.USER_EVENTS, handleUserEvent);
    await subClient.subscribe(REDIS_CHANNELS.MESSAGES, handleMessageEvent);
    
    console.log('Redis subscriptions established');
  } catch (err) {
    console.error('Could not connect to Redis:', err);
  }
})();

// Redis event handlers
async function handleRoomEvent(message) {
  try {
    const event = JSON.parse(message);
    console.log('Room event received:', event);
    
    // Broadcast room events to all clients in the room
    if (event.roomId && event.type) {
      io.to(event.roomId).emit(event.type, event.data);
    }
  } catch (error) {
    console.error('Error handling room event:', error);
  }
}

async function handleUserEvent(message) {
  try {
    const event = JSON.parse(message);
    console.log('User event received:', event);
    
    // Handle user events
    if (event.roomId && event.userId && event.type) {
      io.to(event.roomId).emit(event.type, event.userId, event.data);
    }
  } catch (error) {
    console.error('Error handling user event:', error);
  }
}

async function handleMessageEvent(message) {
  try {
    const event = JSON.parse(message);
    console.log('Message event received:', event);
    
    // Broadcast chat messages to room
    if (event.roomId && event.message) {
      io.to(event.roomId).emit('createMessage', event.message);
    }
  } catch (error) {
    console.error('Error handling message event:', error);
  }
}

// Helper to publish events to Redis
async function publishEvent(channel, data) {
  try {
    await pubClient.publish(channel, JSON.stringify(data));
  } catch (error) {
    console.error(`Error publishing to ${channel}:`, error);
  }
}

app.get("/", (req, res) => {
  res.redirect(`/${uuidv4()}`);
});

app.get("/:room", (req, res) => {
  res.render("room", { roomId: req.params.room });
});

// Socket.io connection handling with Redis integration
io.on("connection", (socket) => {
  console.log('New user connected:', socket.id);
  
  socket.on("join-room", (roomId, userId) => {
    console.log(`User ${userId} joining room ${roomId}`);
    socket.join(roomId);
    
    // Publish user joined event to Redis
    publishEvent(REDIS_CHANNELS.USER_EVENTS, {
      type: 'user-connected',
      roomId,
      userId,
      data: { timestamp: Date.now() }
    });
    
    // Also emit directly in this instance for immediate local response
    socket.to(roomId).emit("user-connected", userId);
    
    // Handle user disconnect
    socket.on("disconnect", () => {
      publishEvent(REDIS_CHANNELS.USER_EVENTS, {
        type: 'user-disconnected',
        roomId,
        userId,
        data: { timestamp: Date.now() }
      });
      
      socket.to(roomId).emit("user-disconnected", userId);
    });
    
    // Handle messages
    socket.on("message", (message) => {
      const messageData = {
        roomId,
        message: {
          text: message,
          userId,
          timestamp: Date.now()
        }
      };
      
      // Publish message to Redis
      publishEvent(REDIS_CHANNELS.MESSAGES, messageData);
      
      // Also emit directly in this instance
      io.to(roomId).emit("createMessage", messageData.message);
    });
    
    // Handle WebRTC signaling (offer, answer, ICE candidates)
    socket.on("signal", (targetUserId, signal) => {
      publishEvent(REDIS_CHANNELS.USER_EVENTS, {
        type: 'signal',
        roomId,
        userId,
        targetUserId,
        data: signal
      });
      
      socket.to(roomId).emit("signal", userId, targetUserId, signal);
    });
  });
});

server.listen(process.env.PORT || 3030);
console.log("Server running on port", process.env.PORT || 3030);