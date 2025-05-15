const URL = "https://leetcode-status-tracker-extension.onrender.com";

// Modified endpoint to get time statistics
const TIME_STATS_ENDPOINT = `${URL}/time-stats`;

/**
 * Function to fetch time statistics from backend
 * This expects the backend to return:
 * {
 *   today: { online: milliseconds, offline: milliseconds },
 *   previousDay: milliseconds,
 *   weekAverage: milliseconds,
 *   weekBest: milliseconds
 * }
 */
async function fetchTimeStats() {
    try {
        const response = await fetch(TIME_STATS_ENDPOINT);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error("Error fetching time statistics:", error);
        // Return default values in case of error
        return {
            today: { online: 0, offline: 0 },
            previousDay: 0,
            weekAverage: 0,
            weekBest: 0
        };
    }
}

/**
 * Helper function to convert milliseconds to minutes
 * @param {number} ms - milliseconds to convert
 * @returns {number} - minutes
 */
function msToMinutes(ms) {
    return Math.floor(ms / 60000);
}

/**
 * Helper function to format minutes as hours and minutes
 * @param {number} minutes - minutes to format
 * @returns {string} - formatted time string (e.g., "2h 30m")
 */
function formatMinutes(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

// Export functions to be used by other scripts
window.leetCodeStats = {
    fetchTimeStats,
    msToMinutes,
    formatMinutes
};