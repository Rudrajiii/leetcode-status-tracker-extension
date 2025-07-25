const BACKEND_URL = "https://leetcode-status-tracker-extension.onrender.com";
// const BACKEND_URL = "http://localhost:3001";

const LEETCODE_API_ENDPOINT = "https://alfa-leetcode-api.onrender.com";

const mainConatainer = document.querySelector(".main-container");
const progressReport = document.querySelector(".progress-report");
const statusElement = document.getElementById("status");
const lastOnlineElement = document.getElementById("lastOnline");
const warningMsg = document.querySelector(".warning");

const credentialsPage = document.getElementById("credentialsPage");
const statusPage = document.getElementById("statusPage");
const credentialsForm = document.getElementById("credentialsForm");

const userProfilePic = document.getElementById("user-profile-pic");
const userProfileName = document.getElementById("user-profile-name");
const userProfileDisplayName = document.getElementById("user-profile-display-name");

const userBio = document.getElementById("user-bio");
const toggleCheckButton = document.querySelector('input[type=checkbox]');
const focusModeStatus = document.querySelector(".focus-mode-status");

const analysisBtn = document.getElementById("anlysisBtn");
const back = document.getElementById("back");

const registeredUrl = document.querySelector(".registered-url");
const topRightButtons = document.querySelector(".top-right-buttons");

const pieChartHolder = document.querySelector(".chart-container");

analysisBtn.addEventListener("click", function() {
    // Open the analysis page in a new tab
    mainConatainer.style.display = "none";
    /*
    display: flex;
    width: 650px;
    height: 100%;
    flex-direction: column;
    padding: 10px;
    */
   progressReport.style.display = "flex";
   progressReport.style.width = "650px";
   progressReport.style.height = "100%";
   progressReport.style.flexDirection = "column";
   progressReport.style.padding = "10px";
   
});

registeredUrl.addEventListener("click", function() {
    // Opening the analysis page in a new tab
    chrome.tabs.create({ url: "https://leetcode-status-tracker-extension.onrender.com"});
})

back.addEventListener("click", function() {
    progressReport.style.display = "none";
    mainConatainer.style.display = "flex";
})

// Toggle Focus Mode
toggleCheckButton.addEventListener('change', function () {
    const isChecked = this.checked;

    if (isChecked) {
        focusModeStatus.innerText = "Focus Mode is ON";
        focusModeStatus.style.color = "#4CAF50";
    } else {
        focusModeStatus.innerText = "Enable Focus Mode";
        focusModeStatus.style.color = "#f44336";
    }

    chrome.storage.local.set({ toggleCheckButton: isChecked });
});

// Load stored state
chrome.storage.local.get(["toggleCheckButton"], function (data) {
    const isEnabled = data.toggleCheckButton === true;

    toggleCheckButton.checked = isEnabled;

    if (isEnabled) {
        focusModeStatus.innerText = "Focus Mode is ON";
        focusModeStatus.style.color = "#4CAF50";
    } else {
        focusModeStatus.innerText = "Enable Focus Mode";
        focusModeStatus.style.color = "#f44336";
    }
});



function showUserProfile(avatarUrl, displayName , displayName2 , userBioText) {
    if (userProfilePic) userProfilePic.src = avatarUrl;
    if (userProfileName) userProfileName.innerText = displayName;
    if (userBio) userBio.innerText = userBioText; // Placeholder for user bio
    if (userProfileDisplayName) {
        userProfileDisplayName.innerText = displayName2;
        const icon = document.createElement('i');
        icon.style.marginLeft = '6px'; // Add some space between the icon and text
        icon.className = 'fa-solid fa-user';
        userProfileDisplayName.appendChild(icon);
}

}

// Check credentials on load
chrome.storage.local.get(["leetcodeUsername", "leetcodePassword"], (result) => {
    if (result.leetcodeUsername && result.leetcodePassword) {
        // Credentials exist, show status
        console.log("Credentials found:", result.leetcodeUsername, result.leetcodePassword );
        credentialsPage.style.display = "none";
        statusPage.style.display = "block";
        fetchStatus();
        chrome.storage.local.get(["setProfilePic", "setProfileName", "setProfileDisplayName" , "setUserBio"], (profile) => {
            if (profile.setProfilePic && profile.setProfileName) {
                console.log(profile.setProfilePic , profile.setProfileName , profile.setProfileDisplayName);
                showUserProfile(profile.setProfilePic, profile.setProfileName , profile.setProfileDisplayName , profile.setUserBio);
            }else{
                console.log(profile.setProfilePic , profile.setProfileName , profile.setProfileDisplayName);
            }
        });
    } else {
        // No credentials saved, show credential form
        credentialsPage.style.display = "block";
        statusPage.style.display = "none";
    }
});

async function fetchLeetCodeDetailsOfUser(username){
    try {
        const response = await fetch(`${LEETCODE_API_ENDPOINT}/${username}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return [data.avatar, data.username , data.name , data.about];
    } catch (error) {
        console.error("Error fetching LeetCode details:", error);
        return [null, null, null, null];
    }
}

// Handle credential submission
credentialsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const [getUserProfilePic , getUserProfileName , getUserDisplayName , getUserBio] = await fetchLeetCodeDetailsOfUser(username);
    //for instant profile pic and name rendering;
    userProfilePic.src = getUserProfilePic;
    userProfileName.innerText = getUserProfileName;
    userProfileDisplayName.innerText = getUserDisplayName;
    userBio.innerText = getUserBio;

    chrome.storage.local.set({  
                                leetcodeUsername: username,
                                leetcodePassword: password,
                                setProfilePic: getUserProfilePic,
                                setProfileName: getUserProfileName,
                                setProfileDisplayName: getUserDisplayName,
                                setUserBio: getUserBio,
                            }, () => {
        // After storing, switch to status page
        credentialsPage.style.display = "none";
        statusPage.style.display = "block";
        fetchStatus();
    });
});


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
                topRightButtons.style.display = "flex";
            }, 3000);
        }
        
        // Update status display
        if (statusElement) {
            // statusElement.innerText = data.status === "online" ? "🟢 Online" : "🔴 Offline";
            statusElement.innerHTML = data.status === "online"
    ? `<span class="status-dot online"></span> Online`
    : `<span class="status-dot offline"></span> Offline`;
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
                topRightButtons.style.display = "flex";
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