const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const STATUS_FILE = path.join(__dirname, 'status.json');

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

// Load status from file or use default
let userStatus = { 
  status: "offline", 
  last_online: null 
};

// Try to load existing status from file
try {
  if (fs.existsSync(STATUS_FILE)) {
    const data = fs.readFileSync(STATUS_FILE, 'utf8');
    userStatus = JSON.parse(data);
    console.log('Loaded status from file:', userStatus);
  }
} catch (err) {
  console.error('Error loading status file:', err);
}

// Function to save status to file
function saveStatus() {
  try {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(userStatus), 'utf8');
    console.log('Status saved to file');
  } catch (err) {
    console.error('Error saving status file:', err);
  }
}

function readStatus() {
  try {
    if (fs.existsSync(STATUS_FILE)) {
      const data = fs.readFileSync(STATUS_FILE, 'utf8');
      userStatus = JSON.parse(data);
      console.log("----------------------------------------");
      console.log('Loaded status from file:', userStatus);
      console.log("----------------------------------------");
    }
  } catch (err) {
    console.error('Error loading status file:', err);
  }
}


// Middleware
app.use(bodyParser.json());

// Set EJS as the template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Route to render the EJS file
app.get('/', (req, res) => {
  res.render('index', { 
    status: userStatus.status, 
    last_online: userStatus.last_online 
  });
});

// API to update status from the Chrome extension
app.post('/updateStatus', (req, res) => {
  const { status, last_online } = req.body;
  
  if (!status || (status !== "online" && status !== "offline")) {
    return res.status(400).json({ error: "Invalid status" });
  }
  
  if (status === "offline") {
    userStatus.last_online = last_online || Date.now();
  }
  
  userStatus.status = status;
  
  console.log(`🔄 Status updated: ${status}, Last Online: ${userStatus.last_online}`);
  
  // Save the updated status to file
  saveStatus();
  
  // Emit real-time update to all connected clients
  io.emit('statusUpdate', userStatus);

  //debugging
  readStatus();
  
  res.sendStatus(200);
});

// API to fetch current status
app.get('/status', (req, res) => {
  // Always return the actual timestamp, not a dynamic calculation
  res.json(userStatus);
});

// WebSocket connection for real-time updates
io.on('connection', (socket) => {
  console.log('⚡ New client connected');
  
  // Send current status to newly connected clients
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