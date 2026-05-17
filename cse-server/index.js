require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { createServer } = require("http");
const { Server } = require("socket.io");
const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 3000;

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:5173"];

const corsConfig = {
  origin: allowedOrigins,
  credentials: true,
};

app.use(cors(corsConfig));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

const io = new Server(httpServer, {
  cors: corsConfig,
});

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "Collaborative Skill Engine API" });
});

app.get("/server-time", (_req, res) => {
  res.json({ time: new Date().toISOString() });
});

let client;

async function run() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error("MONGODB_URI not set in .env file");
      process.exit(1);
    }

    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });
    await client.connect();
    console.log("[DB] Connected to MongoDB");

    io.on("connection", (socket) => {
      console.log("[Socket] client connected:", socket.id);
      socket.on("disconnect", () => {
        console.log("[Socket] client disconnected:", socket.id);
      });
    });

    httpServer.listen(port, () => {
      console.log(`[Server] running on port ${port}`);
    });
  } catch (error) {
    console.error("[Server] Failed to start:", error.message);
    process.exit(1);
  }
}

run();

module.exports = { app, httpServer };
