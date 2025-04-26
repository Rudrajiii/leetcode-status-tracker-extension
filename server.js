const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');

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
mongoose.connect('mongodb+srv://rudrasaha305:0VyyUS2NAdkECKgI@cluster0.dlv4pwf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
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

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
