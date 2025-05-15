document.addEventListener('DOMContentLoaded', () => {
    const pieChartCtx = document.getElementById('timePieChart')?.getContext('2d');
    if (!pieChartCtx) {
        console.error("Canvas with id 'timePieChart' not found.");
        return;
    }

    const colors = {
        online: '#4CAF50',
        offline: '#f44336',
        average: '#FFB300',
        highest: '#2196F3'
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
                            return `${label}: ${formatDuration(ms)}`;
                        }
                    }
                }
            }
        }
    });

    fetchTimeStats(); // fetch initially
    setInterval(fetchTimeStats, 10000); // every 10s
});
