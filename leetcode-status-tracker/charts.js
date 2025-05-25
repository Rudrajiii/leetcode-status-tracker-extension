document.addEventListener("DOMContentLoaded", () => {
  console.log("Document loaded, fetching time stats...");

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60000);
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs === 0) return `${mins} min`;
    return `${hrs} hr ${mins} min`;
  }
  function getLossColor(percentage) {
    const percent = parseFloat(percentage);
    if (percent <= 20) return '#ffae00'; // Light Orange for moderate losses
    if (percent <= 40) return '#FF5733'; // Dark Orange for small losses
    return '#ee0905'; // Deep Red for large losses
  }

  function getGainColor(percentage) {
    const percent = parseFloat(percentage);
    if (percent <= 10) return '#f9330b'; // Orange for small gains
    if (percent <= 20) return '#ff5e00'; // Yellowish for moderate gains
    if (percent <= 40) return '#f59f0b'; // Bright yellow for significant gains
    return '#4CAF50'; // Green for very high gains
  }


  // Initialize chart contexts after DOM is loaded
  const pieChartCanvas = document.getElementById("timePieChart");
  const progressChartCanvas = document.getElementById("progressChart");
  const progressReportCanvas = document.getElementById("ProgressReportChart");
  if (!pieChartCanvas) {
    console.error("Pie chart canvas not found!");
    return;
  }
  if (!progressChartCanvas) {
    console.error("Progress chart canvas not found!");
    return;
  }
  if (!progressReportCanvas) {
    console.error("Progress report chart canvas not found!");
    return;
  }
  const pieChartCtx = pieChartCanvas.getContext("2d");
  const progressChartCtx = progressChartCanvas.getContext("2d");
  const progressReportCtx = progressReportCanvas.getContext("2d")

  // Helper: Get weekday abbreviation from date string
  function getWeekdayLabel(dateStr) {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const date = new Date(dateStr);
    return days[date.getDay()];
  }
  // Set up color scheme
  const colors = {
    online: "#4CAF50",
    offline: "#f44336",
    average: "#FFB300",
    highest: "#2196F3",
  };

  // Create the pie chart
  const pieChart = new Chart(pieChartCtx, {
    type: "pie",
    data: {
      labels: ["Online Time", "Offline Time"],
      datasets: [
        {
          data: [0, 0], // Placeholder
          backgroundColor: [colors.online, colors.offline],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#9EA0A3", // Change legend text color
          },
        },
        title: { 
            display: true,
            text: "Today's LeetCode Time Distribution",
            color: "#9EA0A3", // Change title text color
         },
        tooltip: {
          callbacks: {
            label: function (context) {
              const ms = context.raw * 60000;

              function formatDuration(ms) {
                const totalSeconds = Math.floor(ms / 1000);
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
                const parts = [];
                if (hours > 0) parts.push(`${hours}h`);
                if (minutes > 0) parts.push(`${minutes}m`);
                if (seconds > 0 || parts.length === 0)
                  parts.push(`${seconds}s`);
                return parts.join(" ");
              }

              const label = context.label || "";
              const readable = formatDuration(ms);
              return `${label}: ${readable}`;
            },
          },
        },
      },
    },
  });


  // Initialize the bar chart
  const progressChart = new Chart(progressChartCtx, {
    type: "bar",
    data: {
      labels: [], // Will be filled dynamically as ["Mon", "Tue", ...]
      datasets: [
        {
          label: "Online Time",
          data: [],
          backgroundColor: colors.online,
          borderRadius: 4,
        },
        {
          label: "Offline Time",
          data: [],
          backgroundColor: colors.offline,
          borderRadius: 4,
        },
      ],
    },
    options: {
      // indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#9EA0A3",
          },
        },
        title: {
          display: true,
          text: "Weekly Online vs Offline Time (Minutes)",
          color: "#9EA0A3",
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const minutes = context.raw;
              const hours = Math.floor(minutes / 60);
              const mins = minutes % 60;
              return `${context.dataset.label}: ${hours}h ${mins}m`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: "#9EA0A3",
          },
        },
        y: {
          ticks: {
            color: "#9EA0A3",
          },
          beginAtZero: true,
          title: {
            display: true,
            text: "Time (minutes)",
            color: "#9EA0A3",
          },
        },
      },
    },
  });

  // Find the part where progressReportChart is initialized and update it:
  window.progressReportChart = new Chart(progressReportCtx, {
      type: 'doughnut',
      data: {
          labels: ['Change', 'Same'],
          datasets: [{
              label: 'Comparison',
              data: [0, 0],
              backgroundColor: ['#ff9900', '#cccccc'],
              borderWidth: 0,
          }]
      },
      options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%', // Make it look like a semi-ring
          rotation: 270, // -90 degrees to show top half and start from left
          circumference: 180, // Keep at 180 for semi-circle
          plugins: {
              legend: {
                  display: false
              },
              title: {
                  display: true,
                  text: "Today vs Yesterday",
                  color: "#9EA0A3"
              },
              tooltip: {
                  enabled: true,
                  callbacks: {
                      label: function(context) {
                          const dataset = context.dataset;
                          const value = context.raw;
                          const label = context.label || '';

                          if (label.includes('Change')) {
                              return `${label}: ${value} min`;
                          }
                          return label;
                      }
                  }
              }
          },
          scales: {
              x: {
                  ticks: {
                      display: false
                  }
              },
              y: {
                  ticks: {
                      display: false
                  }
              }
          }
      }
  });

  async function fetchTimeStats() {
    try {
      const API_URL =
        "https://leetcode-status-tracker-extension.onrender.com/time-stats ";
      const response = await fetch(API_URL);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      console.log("Fetched time stats:", data);
      // ========== PIE CHART ==========
      const onlineMinutes = Math.floor(data.today.online / 60000);
      const offlineMinutes = Math.floor(data.today.offline / 60000);

      pieChart.data.datasets[0].data = [onlineMinutes, offlineMinutes];
      pieChart.update();

      // ========== BAR CHART ==========
      const dailyStats = data.dailyStats || {};
      const dateKeys = Object.keys(dailyStats).sort(); // sort chronologically

      const sortedLabels = [];
      const onlineData = [];
      const offlineData = [];

      const weekdayOrder = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      // Create a map from weekday to data
      const weekdayMap = {};

      for (const dateStr of dateKeys) {
        const weekday = getWeekdayLabel(dateStr);
        const online = Math.floor(dailyStats[dateStr].online / 60000);
        const offline = Math.floor(dailyStats[dateStr].offline / 60000);
        weekdayMap[weekday] = { online, offline };
      }
      // Fill data arrays in correct order
      weekdayOrder.forEach((day) => {
        if (weekdayMap[day]) {
          sortedLabels.push(day);
          onlineData.push(weekdayMap[day].online);
          offlineData.push(weekdayMap[day].offline);
        } else {
          sortedLabels.push(day);
          onlineData.push(null); // No data available
          offlineData.push(null);
        }
      });

      progressChart.data.labels = sortedLabels;
      progressChart.data.datasets[0].data = onlineData;
      progressChart.data.datasets[1].data = offlineData;
      progressChart.update();

      // ========== PROGRESS REPORT CHART LOGIC ==========
        const todayOnlineMillis = data.today.online;
        const previousDayMillis = data.previousDay;
        const todayOnlineMinutes = Math.floor(todayOnlineMillis  / 60000);
        const previousDayMinutes = Math.floor(previousDayMillis / 60000);

        let diff = todayOnlineMillis - previousDayMillis;
        let percentageChange = Math.abs((diff / previousDayMillis) * 100).toFixed(0);
        let changeLabel = diff >= 0 ? `⬆️ ${percentageChange}% Increase` : `⬇️ ${percentageChange}% Decrease`;

        // Determine color based on percentage change
        let changeColor;
        if (diff < 0) {
            // Losses (negative percentages)
            changeColor = getLossColor(percentageChange);
        } else {
            // Gains (positive percentages)
            changeColor = getGainColor(percentageChange);
        }

        // Calculate the proportion for the chart - simplified approach
        // For a 50% increase, we want to show exactly half colored, half gray
        // Direct calculation: percentage value determines the portion
        const percentValue = Math.min(parseInt(percentageChange), 100); // Cap at 100%
        const remainingValue = 100 - percentValue;
        
        // Update the chart data - using direct percentage values
        window.progressReportChart.data.labels = [
            `${diff >= 0 ? '↑' : '↓'} ${percentageChange}%\n${diff >= 0 ? 'More' : 'Less'} Today`,
            `Yesterday\n${previousDayMinutes} min`
        ];
        window.progressReportChart.data.datasets[0].backgroundColor = [changeColor, '#cccccc'];
        window.progressReportChart.data.datasets[0].data = [percentValue, remainingValue];
        window.progressReportChart.update();

        function updateTextElement(id, label, value, color = 'white') {
            const element = document.getElementById(id);
            if (!element) return;

            element.innerHTML = `
                <span class="value" style="color: ${color}">${value}</span>
                <span class="label">${label}</span>
            `;
        }

        // Example usage inside fetchTimeStats():
        updateTextElement('todayTime', 'Today', formatTime(data.today.online));
        updateTextElement('previousDayTime', 'Previous Day', formatTime(data.previousDay));
        updateTextElement('changePercentage', 'Change', changeLabel, changeColor);
        updateTextElement('dailyAverage', 'Daily Average', formatTime(data.weekAverage));
        updateTextElement('mostActiveDay', 'Most Active Day', formatTime(data.weekBest));
      
    } catch (error) {
      console.error("Failed to fetch time stats:", error);
    }
  }

  // Initial load + auto refresh
  fetchTimeStats();
  setInterval(fetchTimeStats, 5000);
});
