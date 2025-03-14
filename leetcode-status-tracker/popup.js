const BACKEND_URL = "http://localhost:3001";
const statusElement = document.getElementById("status");
const lastOnlineElement = document.getElementById("lastOnline");
const warningMsg = document.querySelector(".warning");

// Function to calculate time ago
function timeAgo(timestamp) {
    if (!timestamp) return "Unknown";
    
    const diffSeconds = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSeconds < 60) return `${diffSeconds} seconds ago`;
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} minutes ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} hours ago`;
    return `${Math.floor(diffSeconds / 86400)} days ago`;
}

// Function to fetch and display status
async function fetchStatus() {
    try {
        const response = await fetch(`${BACKEND_URL}/status`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Remove warning message after 3 seconds
        if (warningMsg) {
            setTimeout(() => {
                warningMsg.remove();
            }, 3000);
        }
        
        // Update status display
        if (statusElement) {
            statusElement.innerText = data.status === "online" ? "🟢 Online" : "🔴 Offline";
        }
        
        // Update last online display
        if (lastOnlineElement && data.last_online) {
            const timeAgoString = timeAgo(data.last_online);
            lastOnlineElement.innerText = timeAgoString;
            
            // If offline, start updating the time ago display every second
            if (data.status === "offline") {
                startTimer(data.last_online);
            }
        } else if (lastOnlineElement) {
            lastOnlineElement.innerText = "Unknown";
        }
    } catch (error) {
        console.error("Error fetching status:", error);
        
        if (warningMsg) {
            setTimeout(() => {
                warningMsg.remove();
            }, 3000);
        }
        
        if (statusElement) {
            statusElement.innerText = "❌ Error";
        }
        
        if (lastOnlineElement) {
            lastOnlineElement.innerText = "N/A";
        }
    }
}

// Timer to update the "time ago" display
let timerInterval = null;

function startTimer(timestamp) {
    // Clear any existing interval
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    // Update every second
    timerInterval = setInterval(() => {
        if (lastOnlineElement) {
            lastOnlineElement.innerText = timeAgo(timestamp);
        } else {
            // If element no longer exists, clear the interval
            clearInterval(timerInterval);
        }
    }, 1000);
}

// Load status when popup opens
fetchStatus();

// Clean up when the popup closes
window.addEventListener('unload', () => {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
});