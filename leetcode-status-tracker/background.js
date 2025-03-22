const BACKEND_URL = "https://leetcode-status-tracker-extension.onrender.com/updateStatus";

// Function to update status on the backend
async function updateStatus(status) {
    const payload = { status };
    
    if (status === "offline") {
        payload.last_online = Date.now(); // Send timestamp when going offline
    }
    
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
    } catch (error) {
        console.error("Failed to update status:", error);
        // Try again after a short delay (1 second)
        setTimeout(() => updateStatus(status), 1000);
    }
}

// Keep track of whether LeetCode is open in any tab
let isLeetCodeOpen = false;

// Check all tabs to determine if LeetCode is open
function checkForLeetCodeTabs() {
    chrome.tabs.query({}, (tabs) => {
        const leetCodeTabs = tabs.filter(tab => tab.url && tab.url.includes("leetcode.com"));
        const wasOpen = isLeetCodeOpen;
        isLeetCodeOpen = leetCodeTabs.length > 0;
        
        // Only send an update if the status has changed
        if (wasOpen !== isLeetCodeOpen) {
            updateStatus(isLeetCodeOpen ? "online" : "offline");
        }
    });
}

// Handle browser startup
chrome.runtime.onStartup.addListener(() => {
    // Check if the status was online before browser was closed
    chrome.storage.local.get("leetCodeStatus", (data) => {
        if (data.leetCodeStatus === "online") {
            // If it was online before, now it's offline since browser was closed
            updateStatus("offline");
        }
    });
});

// Handle browser shutdown
chrome.runtime.onSuspend.addListener(() => {
    // When browser is closing, always set to offline
    updateStatus("offline");
});

// Initial check - also check stored status
chrome.storage.local.get("leetCodeStatus", (data) => {
    // If previously stored as online, verify it's actually open
    if (data.leetCodeStatus === "online") {
        checkForLeetCodeTabs();
    }
});

// Listen for tab updates (created, updated, removed)
chrome.tabs.onCreated.addListener(checkForLeetCodeTabs);
chrome.tabs.onUpdated.addListener(checkForLeetCodeTabs);
chrome.tabs.onRemoved.addListener(checkForLeetCodeTabs);

// Periodically check status (every 5 seconds) as a failsafe
setInterval(checkForLeetCodeTabs, 5000);