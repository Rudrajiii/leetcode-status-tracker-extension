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

// Enable CORS for all routes
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

// Enhanced log schema with date information
const logSchema = new mongoose.Schema({
  status: { type: String, enum: ['online', 'offline'], required: true },
  timestamp: { type: Number, required: true },
  date: { type: String, required: true } // YYYY-MM-DD format for easier querying
});

const StatusLog = mongoose.model('StatusLog', logSchema);

// Helper function to get date in YYYY-MM-DD format
function getDateString(timestamp = Date.now()) {
  const date = new Date(timestamp);
  return date.toISOString().split('T')[0];
}

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
    const now = Date.now();
    await StatusLog.create({ 
      status, 
      timestamp: now,
      date: getDateString(now)
    });
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

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];

  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
  }

  return parts.join(', ');
}


// Enhanced time stats endpoint that provides daily and weekly data
app.get('/time-stats', async (req, res) => {
  try {
    const today = getDateString();
    const yesterday = getDateString(Date.now() - 86400000); // 24 hours ago
    
    // Get all logs from the past 7 days
    const sevenDaysAgo = getDateString(Date.now() - 7 * 86400000);
    const weekLogs = await StatusLog.find({
      date: { $gte: sevenDaysAgo }
    }).sort({ timestamp: 1 });
    
    // Group logs by date
    const logsByDate = {};
    
    for (const log of weekLogs) {
      if (!logsByDate[log.date]) {
        logsByDate[log.date] = [];
      }
      logsByDate[log.date].push(log);
    }
    
    // Calculate online time for each day
    const dailyStats = {};
    let weekTotal = 0;
    let weekBest = 0;
    let daysWithData = 0;
    
    // Process each day's logs
    Object.keys(logsByDate).forEach(date => {
      const logs = logsByDate[date];
      let dayOnline = 0;
      let dayOffline = 0;
      let lastTimestamp = null;
      let lastStatus = null;
      
      // Calculate time between status changes
      for (const log of logs) {
        if (lastTimestamp !== null && lastStatus !== null) {
          const duration = log.timestamp - lastTimestamp;
          if (lastStatus === "online") {
            dayOnline += duration;
          } else {
            dayOffline += duration;
          }
        }
        lastTimestamp = log.timestamp;
        lastStatus = log.status;
      }
      
      // If the day is today and the last status is still ongoing
      if (date === today && lastStatus !== null) {
        const now = Date.now();
        if (lastStatus === "online") {
          dayOnline += now - lastTimestamp;
        } else {
          dayOffline += now - lastTimestamp;
        }
      }
      
      // Store daily stats
      dailyStats[date] = {
        online: dayOnline,
        offline: dayOffline
      };
      
      // Update weekly totals
      weekTotal += dayOnline;
      weekBest = Math.max(weekBest, dayOnline);
      daysWithData++;
    });
    
    // Calculate weekly average
    const weekAverage = daysWithData > 0 ? weekTotal / daysWithData : 0;
    let x = formatDuration(dailyStats[today]?.online || 0);
    let y = formatDuration(dailyStats[today]?.offline || 0);
    console.log("dailyStats ",dailyStats[today]);
    // Format the response
    res.json({
      today: dailyStats[today] || { online: 0, offline: 0 },
      previousDay: dailyStats[yesterday]?.online || 0,
      weekAverage: weekAverage,
      weekBest: weekBest,
      dailyStats: dailyStats, // Include all daily stats for potential detailed view
      testing: {online:x, offline:y}
    });
  } catch (error) {
    console.error("Error in time-stats:", error);
    res.status(500).json({ error: "Failed to fetch time statistics" });
  }
});

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
