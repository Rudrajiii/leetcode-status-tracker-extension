// const BACKEND_URL = "http://localhost:3001/updateStatus";
const BACKEND_URL = "https://leetcode-status-tracker-extension.onrender.com/updateStatus";

// Track active tab and activity state
let activeLeetCodeTabId = null;
let lastActivityTime = Date.now();
const INACTIVITY_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds
let lastStatus = null; // Track the previous status to avoid unnecessary updates


// Function to update status on the backend
async function updateStatus(status) {
    // If status hasn't changed, don't update unless it's a periodic refresh of online status
    if (status === lastStatus && (status === "offline" || Date.now() - lastActivityTime > 60000)) {
        console.log(`Status unchanged (${status}), skipping update`);
        return;
    }

    // Get current status first to make intelligent decisions
    let currentStatus = null;
    try {
        const statusResponse = await fetch(`${BACKEND_URL.replace('/updateStatus', '/status')}`);
        if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            currentStatus = statusData.status;
        }
    } catch (error) {
        console.error("Failed to get current status:", error);
    }

    const payload = { status };
    
    // Only include last_online when FIRST transitioning from online to offline
    if (status === "offline" && currentStatus === "online") {
        payload.last_online = Date.now();
        console.log("Setting new last_online timestamp");
    } else {
        // For any other state transition, do NOT include last_online to prevent overwriting the server timestamp
        console.log("Not including last_online in this update");
    }
    

    
    // Store the current status in local storage IMMEDIATELY
    chrome.storage.local.set({ 
        "leetCodeStatus": status,
        "lastStatusUpdate": Date.now()
    });
    
    try {
        const response = await fetch(BACKEND_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        
        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }
        
        console.log(`Status updated: ${status}`);
        lastStatus = status; // Update the last status
    } catch (error) {
        console.error("Failed to update status:", error);
        // Try again after a short delay (1 second)
        setTimeout(() => updateStatus(status), 1000);
    }
}

// Function to check status without updating
async function checkCurrentStatus() {
    try {
        const statusResponse = await fetch(`${BACKEND_URL.replace('/updateStatus', '/status')}`);
        if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            return statusData;
        }
    } catch (error) {
        console.error("Failed to check current status:", error);
    }
    return null;
}

// Check if the user is active on a LeetCode tab
function checkLeetCodeActivity() {
    // First check if we have an active LeetCode tab
    if (activeLeetCodeTabId !== null) {
        // Check if this tab still exists and is a LeetCode tab
        chrome.tabs.get(activeLeetCodeTabId, function(tab) {
            if (chrome.runtime.lastError) {
                // Tab no longer exists
                console.log("Active LeetCode tab no longer exists:", chrome.runtime.lastError.message);
                activeLeetCodeTabId = null;
                updateStatus("offline");
                return;
            }
            
            // Check if the tab is still a LeetCode tab
            if (!tab.url || !tab.url.includes("leetcode.com")) {
                console.log("Active tab is no longer a LeetCode tab");
                activeLeetCodeTabId = null;
                updateStatus("offline");
                return;
            }
            
            // Check if tab is active/focused
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                const isLeetCodeTabActive = tabs.length > 0 && tabs[0].id === activeLeetCodeTabId;
                
                // Check if user is still active (not inactive for too long)
                const currentTime = Date.now();
                const isUserActive = (currentTime - lastActivityTime) < INACTIVITY_THRESHOLD;
                
                if (isLeetCodeTabActive && isUserActive) {
                    // User is active on a LeetCode tab
                    updateStatus("online");
                } else {
                    // LeetCode tab exists but is not the active tab or user is inactive
                    updateStatus("offline");
                }
            });
        });
    } else {
        // Check if any LeetCode tab is currently active
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs.length > 0 && tabs[0].url && tabs[0].url.includes("leetcode.com")) {
                // Found an active LeetCode tab
                activeLeetCodeTabId = tabs[0].id;
                updateStatus("online");
            } else {
                // No active LeetCode tab
                updateStatus("offline");
            }
        });
    }
}

// Track when a LeetCode tab becomes active
chrome.tabs.onActivated.addListener(function(activeInfo) {
    chrome.tabs.get(activeInfo.tabId, function(tab) {
        if (chrome.runtime.lastError) {
            console.log("Error getting tab:", chrome.runtime.lastError.message);
            return;
        }
        
        if (tab.url && tab.url.includes("leetcode.com")) {
            console.log("LeetCode tab activated");
            activeLeetCodeTabId = activeInfo.tabId;
            lastActivityTime = Date.now();
            updateStatus("online");
        } else if (activeLeetCodeTabId !== null) {
            // User switched to a non-LeetCode tab
            console.log("Non-LeetCode tab activated");
            updateStatus("offline");
        }
    });
});

// Track when a tab's URL changes
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.url) {
        if (tabId === activeLeetCodeTabId && !changeInfo.url.includes("leetcode.com")) {
            // Active LeetCode tab navigated away from LeetCode
            console.log("Active LeetCode tab navigated away");
            activeLeetCodeTabId = null;
            updateStatus("offline");
        } else if (changeInfo.url.includes("leetcode.com")) {
            // Check if this tab is active
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                if (tabs.length > 0 && tabs[0].id === tabId) {
                    console.log("Tab updated to LeetCode URL and is active");
                    activeLeetCodeTabId = tabId;
                    lastActivityTime = Date.now();
                    updateStatus("online");
                }
            });
        }
    }
});

// Track when a tab is closed
chrome.tabs.onRemoved.addListener(function(tabId) {
    if (tabId === activeLeetCodeTabId) {
        console.log("Active LeetCode tab closed");
        activeLeetCodeTabId = null;
        updateStatus("offline");
    }
});

// Track user activity in LeetCode tabs
function setupActivityTracking() {
    // Inject a content script to track user activity in LeetCode tabs
    chrome.tabs.query({ url: "*://*.leetcode.com/*" }, function(tabs) {
        tabs.forEach(tab => {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: trackUserActivity
            }).catch(err => console.error("Failed to inject activity tracking script:", err));
        });
    });
}

// This function will be injected into LeetCode tabs
function trackUserActivity() {
    // Only set up listeners once
    if (window.leetCodeActivityTrackerSetup) return;
    window.leetCodeActivityTrackerSetup = true;
    
    const events = ['mousedown', 'keydown', 'mousemove', 'wheel', 'scroll'];
    
    // Add throttling to avoid excessive messages
    let lastActivityUpdate = Date.now();
    const THROTTLE_DELAY = 5000; // 5 seconds
    
    function reportActivity() {
        const now = Date.now();
        if (now - lastActivityUpdate > THROTTLE_DELAY) {
            lastActivityUpdate = now;
            chrome.runtime.sendMessage({ action: "userActivity" });
        }
    }
    
    // Add event listeners for user activity
    events.forEach(event => {
        document.addEventListener(event, reportActivity, { passive: true });
    });
    
    // Report initial activity
    reportActivity();
    
    // Also report when tab visibility changes
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            reportActivity();
        }
    });
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener(function(message) {
    if (message.action === "userActivity") {
        lastActivityTime = Date.now();
        
        // Only update if we previously went offline due to inactivity
        chrome.storage.local.get("leetCodeStatus", function(data) {
            if (data.leetCodeStatus === "offline") {
                checkLeetCodeActivity();
            }
        });
    }
});

// Handle browser startup
chrome.runtime.onStartup.addListener(function() {
    console.log("Browser started");
    
    // Check current status first
    fetch(`${BACKEND_URL.replace('/updateStatus', '/status')}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === "online") {
                // Only update if current status is online
                console.log("Currently online, marking as offline");
                updateStatus("offline");
            } else {
                console.log("Already offline, no need to update");
                // Just check for LeetCode tabs and activity
                checkLeetCodeActivity();
            }
        })
        .catch(error => {
            console.error("Error checking status on startup:", error);
            // If we can't check, just run the normal check
            checkLeetCodeActivity();
        });
        
    // Set up activity tracking
    setupActivityTracking();
});

// Handle browser shutdown
chrome.runtime.onSuspend.addListener(function() {
    // When browser is closing, update only if currently online
    chrome.storage.local.get("leetCodeStatus", function(data) {
        if (data.leetCodeStatus === "online") {
            console.log("Browser shutting down, setting status to offline");
            updateStatus("offline");
        } else {
            console.log("Browser shutting down, already offline");
        }
    });
});

// Initial check when extension loads
chrome.storage.local.get(["leetCodeStatus", "lastStatusUpdate" , "toggleCheckButton"], function(data) {
    console.log("Initial check, saved status:", data.leetCodeStatus);
    console.log("toggle checkButton:", data.toggleCheckButton);
    // Update last known status
    lastStatus = data.leetCodeStatus || null;
    
    // Then check current tabs and activity
    checkLeetCodeActivity();
    
    // Set up activity tracking
    setupActivityTracking();
});

// Handle when a new LeetCode tab is created or a tab navigates to LeetCode
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes("leetcode.com")) {
        // Inject activity tracking script
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            function: trackUserActivity
        }).catch(err => console.error("Failed to inject activity tracking script:", err));
    }
});

// Smart periodic check - avoid resetting last_online time
async function smartPeriodicCheck() {
    // Get current status from server
    const currentStatus = await checkCurrentStatus();
    
    // If we're already offline, don't run a check that might reset the timestamp
    if (currentStatus && currentStatus.status === "offline") {
        console.log("Periodic check: Currently offline, preserving last_online timestamp");
        // Only check if we need to go online
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs.length > 0 && tabs[0].url && tabs[0].url.includes("leetcode.com")) {
                // Found an active LeetCode tab - go back online
                activeLeetCodeTabId = tabs[0].id;
                updateStatus("online");
            }
        });
    } else {
        // We're online, so run the full check
        checkLeetCodeActivity();
    }
}

// Periodically check status (every 30 seconds)
setInterval(smartPeriodicCheck, 30000);

// Additional handler for when system is idle or locked
if (chrome.idle) {
    chrome.idle.onStateChanged.addListener(function(state) {
        console.log("System state changed to:", state);
        if (state === "idle" || state === "locked") {
            // If user is idle/locked, mark as offline
            chrome.storage.local.get("leetCodeStatus", function(data) {
                if (data.leetCodeStatus === "online") {
                    updateStatus("offline");
                }
            });
        } else if (state === "active") {
            // When user becomes active again, check status
            checkLeetCodeActivity();
        }
    });
    
    // Set idle detection threshold to 2 minutes
    chrome.idle.setDetectionInterval(120);
}