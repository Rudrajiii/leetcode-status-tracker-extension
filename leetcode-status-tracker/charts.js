let pieChart; // Declare globally to update it later

// Function to fetch and update time stats
async function fetchTimeStats() {
    try {
        const API_URL = "https://leetcode-status-tracker-extension.onrender.com/time-stats";
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        console.log("Fetched time stats:", data);

        const onlineMinutes = Math.floor(data.today.online / 60000);
        const offlineMinutes = Math.floor(data.today.offline / 60000);

        console.log("Today's online minutes:", onlineMinutes);
        console.log("Today's offline minutes:", offlineMinutes);

        if (pieChart) {
            pieChart.data.datasets[0].data = [onlineMinutes, offlineMinutes];
            pieChart.update();
        }

    } catch (error) {
        console.error("Failed to fetch or update time stats:", error);
    }
}

// DOMContentLoaded to initialize the chart
document.addEventListener('DOMContentLoaded', () => {
    const pieChartCtx = document.getElementById('timePieChart')?.getContext('2d');
    if (!pieChartCtx) {
        console.error("Canvas with id 'timePieChart' not found.");
        return;
    }

    const colors = {
        online: '#4CAF50',
        offline: '#f44336'
    };

    pieChart = new Chart(pieChartCtx, {
        type: 'pie',
        data: {
            labels: ['Online Time', 'Offline Time'],
            datasets: [{
                data: [0, 0],
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
                            const ms = context.raw * 60000;
                            const totalSeconds = Math.floor(ms / 1000);
                            const hours = Math.floor(totalSeconds / 3600);
                            const minutes = Math.floor((totalSeconds % 3600) / 60);
                            const seconds = totalSeconds % 60;

                            const parts = [];
                            if (hours > 0) parts.push(`${hours}h`);
                            if (minutes > 0) parts.push(`${minutes}m`);
                            if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

                            return `${context.label}: ${parts.join(' ')}`;
                        }
                    }
                }
            }
        }
    });

    fetchTimeStats();                  // Fetch once on load
    setInterval(fetchTimeStats, 10000); // Fetch every 10 seconds
});
