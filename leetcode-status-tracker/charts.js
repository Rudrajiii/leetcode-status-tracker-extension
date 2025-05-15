// Initialize chart contexts
const pieChartCtx = document.getElementById('timePieChart').getContext('2d');
// const progressChartCtx = document.getElementById('progressChart').getContext('2d');
console.log("Pie chart context:", pieChartCtx);
// Set up color scheme
const colors = {
    online: '#4CAF50',    // Green
    offline: '#f44336',   // Red
    average: '#FFB300',   // Amber
    highest: '#2196F3'    // Blue
};

// Create the pie chart
let pieChart = new Chart(pieChartCtx, {
    type: 'pie',
    data: {
        labels: ['Online Time', 'Offline Time'],
        datasets: [{
            data: [0, 0], // Placeholder data
            backgroundColor: [colors.online, colors.offline],
            borderWidth: 1
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom'
            },
            title: {
                display: true,
                text: "Today's LeetCode Time Distribution"
            },
            tooltip: {
  callbacks: {
    label: function(context) {
      const ms = context.raw * 60000; // Convert minutes to milliseconds

      function formatDuration(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        const parts = [];
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

        return parts.join(' ');
      }

      const label = context.label || '';
      const readable = formatDuration(ms);
      return `${label}: ${readable}`;
    }
  }
}

        }
    }
});

// Create the progress chart
// let progressChart = new Chart(progressChartCtx, {
//     type: 'bar',
//     data: {
//         labels: ['Previous Day', 'Today', 'Week Average', 'Week Best'],
//         datasets: [{
//             label: 'Online Time (minutes)',
//             data: [0, 0, 0, 0],
//             backgroundColor: [
//                 colors.offline,
//                 colors.online,
//                 colors.average,
//                 colors.highest
//             ],
//             borderWidth: 1
//         }]
//     },
//     options: {
//         responsive: true,
//         maintainAspectRatio: false,
//         scales: {
//             y: {
//                 beginAtZero: true,
//                 title: {
//                     display: true,
//                     text: 'Minutes'
//                 }
//             }
//         },
//         plugins: {
//             title: {
//                 display: true,
//                 text: 'Weekly Progress Comparison'
//             },
//             tooltip: {
//                 callbacks: {
//                     label: function(context) {
//                         const value = context.raw;
//                         const hours = Math.floor(value / 60);
//                         const minutes = value % 60;
//                         return `${hours}h ${minutes}m`;
//                     }
//                 }
//             }
//         }
//     }
// });

// Fetch and update chart data
async function fetchTimeStats() {
    try {
        const API_URL = "https://leetcode-status-tracker-extension.onrender.com/time-stats";
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Fetched time stats:", data);
        
        // Update pie chart with today's data
        const onlineMinutes = Math.floor(data.today.online / 60000);
        const offlineMinutes = Math.floor(data.today.offline / 60000);

        console.log("Today's online minutes:", onlineMinutes);
        console.log("Today's offline minutes:", offlineMinutes);
        
        pieChart.data.datasets[0].data = [onlineMinutes, offlineMinutes];
        pieChart.update();
        
        // Update progress chart with comparison data
        // const previousDayMinutes = Math.floor(data.previousDay / 60000);
        // const todayMinutes = onlineMinutes;
        // const weekAverageMinutes = Math.floor(data.weekAverage / 60000);
        // const weekBestMinutes = Math.floor(data.weekBest / 60000);
        
        // progressChart.data.datasets[0].data = [
        //     previousDayMinutes,
        //     todayMinutes,
        //     weekAverageMinutes,
        //     weekBestMinutes
        // ];
        // progressChart.update();
        
    } catch (error) {
        console.error("Failed to fetch time stats:", error);
    }
}

// Initialize and set up auto refresh
document.addEventListener('DOMContentLoaded', () => {
    // Initial load
    console.log("Document loaded, fetching time stats...");
    try{

        fetchTimeStats();
    }catch (error) {
        console.error("Error during initial fetch:", error);
    }
    console.log("Time stats fetched and charts updated.");
    // Auto update every 30 seconds
    setInterval(fetchTimeStats, 1000);
});