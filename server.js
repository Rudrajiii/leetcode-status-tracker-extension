const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config()

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Enable CORS for all routes //
app.use(cors());
app.use(bodyParser.json());

// Set EJS as the template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("📌 Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// Define a schema and model for user status
const statusSchema = new mongoose.Schema({
  status: { type: String, required: true },
  last_online: { type: Number, default: null }
});

const Status = mongoose.model('Status', statusSchema);

const logSchema = new mongoose.Schema({
  status: { type: String, enum: ['online', 'offline'], required: true },
  timestamp: { type: Number, required: true }
});

const StatusLog = mongoose.model('StatusLog', logSchema);


// Load status from DB or use default
async function getStatusFromDB() {
  let userStatus = await Status.findOne();
  if (!userStatus) {
    userStatus = new Status({ status: "offline", last_online: null });
    await userStatus.save();
  }
  return userStatus;
}

// Route to render the EJS file
app.get('/', async (req, res) => {
  const userStatus = await getStatusFromDB();
  res.render('index', { 
    status: userStatus.status, 
    last_online: userStatus.last_online 
  });
});

// API to update status
app.post('/updateStatus', async (req, res) => {
  const { status, last_online } = req.body;
  
  if (!status || (status !== "online" && status !== "offline")) {
    return res.status(400).json({ error: "Invalid status" });
  }
  
  let userStatus = await getStatusFromDB();
  if (userStatus.status !== status) {
    // Save log entry when the status changes
    await StatusLog.create({ status, timestamp: Date.now() });
  }
  
  if (status === "offline") {
    userStatus.last_online = last_online || Date.now();
  }
  
  userStatus.status = status;
  await userStatus.save();
  
  console.log(`🔄 Status updated: ${status}, Last Online: ${userStatus.last_online}`);
  
  io.emit('statusUpdate', userStatus);
  res.sendStatus(200);
});

// API to fetch current status
app.get('/status', async (req, res) => {
  const userStatus = await getStatusFromDB();
  res.json(userStatus);
});

// WebSocket connection for real-time updates
io.on('connection', async (socket) => {
  console.log('⚡ New client connected');
  
  const userStatus = await getStatusFromDB();
  socket.emit('statusUpdate', userStatus);
  
  socket.on('disconnect', () => {
    console.log('❌ Client disconnected');
  });
});

app.get('/time-stats', async (req, res) => {
  const logs = await StatusLog.find().sort({ timestamp: 1 });

  let onlineTime = 0;
  let offlineTime = 0;
  let lastTimestamp = null;
  let lastStatus = null;

  for (const log of logs) {
    if (lastTimestamp !== null && lastStatus !== null) {
      const duration = log.timestamp - lastTimestamp;
      if (lastStatus === "online") {
        onlineTime += duration;
      } else {
        offlineTime += duration;
      }
    }
    lastTimestamp = log.timestamp;
    lastStatus = log.status;
  }

  // If currently online, count time from last log to now
  if (lastStatus === "online") {
    onlineTime += Date.now() - lastTimestamp;
  } else if (lastStatus === "offline") {
    offlineTime += Date.now() - lastTimestamp;
  }

  res.json({
    online: onlineTime,
    offline: offlineTime
  });
});


// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
