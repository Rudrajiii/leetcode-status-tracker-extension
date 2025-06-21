const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const moment = require('moment-timezone'); // For Indian Time handling
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Use middleware
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

//Here is my all schema's
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
  date: { type: String, required: true } // YYYY-MM-DD format
});

const StatusLog = mongoose.model('StatusLog', logSchema);

// Schema to store the time stats
const leetCodeYesterDayTimeStatsSchema = new mongoose.Schema({
  date:{
    type: String,
    required: true,
    unique: true //each date is unique
  },
  online: { type: Number, default: 0 }, // Total online time in milliseconds
  offline: { type: Number, default: 0 }, // Total offline time in milliseconds
  humanReadableOnline: { type: String, default: "0 seconds" }, // Human-readable format
  humanReadableOffline: { type: String, default: "0 seconds" }, // Human-readable format
});

const LeetCodeYesterDayTimeStats = mongoose.model('LeetCodeYesterDayTimeStats', leetCodeYesterDayTimeStatsSchema);

// Constants
const INDIAN_TIMEZONE = 'Asia/Kolkata';

// Helper functions
function getIndianDateString(timestamp = Date.now()) {
  return moment(timestamp).tz(INDIAN_TIMEZONE).format("YYYY-MM-DD");
}

function getIndianDayBounds(timestamp = Date.now()) {
  const date = moment(timestamp).tz(INDIAN_TIMEZONE);
  return {
    start: date.clone().startOf('day').valueOf(), // 00:00:00 IST
    end: date.clone().endOf('day').valueOf()       // 23:59:59 IST
  };
}

function getWeekKey(dateString) {
  const date = moment(dateString, "YYYY-MM-DD");
  const sunday = date.clone().startOf('week'); // Week starts on Sunday
  return sunday.format("YYYY-MM-DD");
}

async function getStatusFromDB() {
  let userStatus = await Status.findOne();
  if (!userStatus) {
    userStatus = new Status({ status: "offline", last_online: null });
    await userStatus.save();
  }
  return userStatus;
}

// Close any open-ended logs at midnight
async function finalizeOpenLogs() {
  const latestLog = await StatusLog.findOne().sort({ timestamp: -1 });
  if (!latestLog) return;

  const now = Date.now();
  const { end } = getIndianDayBounds(now);

  if (latestLog.status === "online" && now > end) {
    await StatusLog.create({
      status: "offline",
      timestamp: end,
      date: getIndianDateString(end)
    });

    console.log("🔒 Closed open online session at midnight:", new Date(end).toISOString());
  }
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
  const previousStatus = userStatus.status;

  // Create a log entry only when status changes
  if (previousStatus !== status) {
    const now = Date.now();
    await StatusLog.create({
      status,
      timestamp: now,
      date: getIndianDateString(now)
    });
    console.log(`📊 Log created: ${status} at ${new Date(now).toISOString()}`);
  }

  // IMPORTANT FIX: Only update last_online when transitioning FROM online TO offline
  if (status === "offline" && previousStatus === "online") {
    userStatus.last_online = last_online || Date.now();
    console.log(`📆 Last online timestamp updated: ${new Date(userStatus.last_online).toISOString()}`);
  }
  // Do NOT update last_online when already offline or when going from offline to online

  userStatus.status = status;
  await userStatus.save();

  console.log(`🔄 Status updated: ${status}, Last Online: ${userStatus.last_online ? new Date(userStatus.last_online).toISOString() : 'None'}`);

  io.emit('statusUpdate', userStatus);
  res.sendStatus(200);
});

// API to fetch current status
app.get('/status', async (req, res) => {
  const userStatus = await getStatusFromDB();
  res.json(userStatus);
});

// Format duration in human-readable form
function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);

  return parts.join(', ');
}

// Get time statistics by day and week
app.get('/time-stats', async (req, res) => {
  try {
    const today = getIndianDateString();
    const yesterday = getIndianDateString(Date.now() - 86400000); // 24h ago

    const sevenDaysAgo = getIndianDateString(Date.now() - 7 * 86400000);
    const weekLogs = await StatusLog.find({
      date: { $gte: sevenDaysAgo }
    }).sort({ timestamp: 1 });

    const logsByDate = {};
    for (const log of weekLogs) {
      if (!logsByDate[log.date]) logsByDate[log.date] = [];
      logsByDate[log.date].push(log);
    }

    const dailyStats = {};
    let weekTotal = 0;
    let weekBest = 0;
    let daysWithData = 0;

    Object.keys(logsByDate).forEach(date => {
      const logs = logsByDate[date];
      let dayOnline = 0;
      let dayOffline = 0;
      let lastTimestamp = null;
      let lastStatus = null;

      for (const log of logs) {
        if (lastTimestamp !== null && lastStatus !== null) {
          const duration = log.timestamp - lastTimestamp;
          if (lastStatus === "online") dayOnline += duration;
          else dayOffline += duration;
        }
        lastTimestamp = log.timestamp;
        lastStatus = log.status;
      }

      if (date === today && lastStatus !== null) {
        const now = Date.now();
        if (lastStatus === "online") dayOnline += now - lastTimestamp;
        else dayOffline += now - lastTimestamp;
      }

      dailyStats[date] = { online: dayOnline, offline: dayOffline };
      weekTotal += dayOnline;
      weekBest = Math.max(weekBest, dayOnline);
      daysWithData++;
    });

    const weekAverage = daysWithData > 0 ? weekTotal / daysWithData : 0;

    let x = formatDuration(dailyStats[today]?.online || 0);
    let y = formatDuration(dailyStats[today]?.offline || 0);
    console.log("dailyStats ",dailyStats,Date.now());

    let previousDayTimeData = dailyStats[yesterday] || { online: 0, offline: 0 };
    let previousDayOnline = previousDayTimeData.online;
    let previousDayOffline = previousDayTimeData.offline;
    let humanReadableOnline = formatDuration(previousDayOnline);
    let humanReadableOffline = formatDuration(previousDayOffline); 
    
    try{
      let saveTimeStatsData = await LeetCodeYesterDayTimeStats.create({
      date: yesterday,
      online: previousDayOnline,
      offline: previousDayOffline,
      humanReadableOnline: humanReadableOnline,
      humanReadableOffline: humanReadableOffline
    });

    console.log("Saved previous day time stats: ", saveTimeStatsData);
    }catch(error){
      console.error("bruh it's a duplicate key error");
    }
    
    
    console.log("Previous Day Time Data: ", previousDayTimeData);
    res.json({
      today: dailyStats[today] || { online: 0, offline: 0 },
      previousDay: dailyStats[yesterday]?.online || 0,
      weekAverage,
      weekBest,
      dailyStats,
      test: {
        x: x,
        y: y,
        today:yesterday
      }
    });
  } catch (error) {
    console.error("Error fetching time stats:", error);
    res.status(500).json({ error: "Failed to fetch time statistics" });
  }
});


app.get("/get-my-online-stats", async (req , res ) => {
  try{
    const allTimeStats = await LeetCodeYesterDayTimeStats.find({}).sort({date:1});
    res.json(allTimeStats);
  }catch(error){
    console.error("Error fetching online stats: ", error);
    res.status(500).json({ error: "Failed to fetch online stats" });
  }
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

// Start server
const PORT = process.env.PORT || 3001;
finalizeOpenLogs().catch(console.error);

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});