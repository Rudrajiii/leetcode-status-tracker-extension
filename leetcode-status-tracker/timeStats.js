/**
 * @getYesterday
 * This function returns the date of yesterday in the format YYYY-MM-DD.
 * @getPreviousDayOfYesterday
 * This function returns the date of the day before yesterday in the format YYYY-MM-DD.
 * @msToDecimalMinutes
 * This function converts milliseconds to decimal minutes and returns it as a string with two decimal places.
 * @fetchOverAllOnlineDataFromServer
 * This function fetches overall online data from the server using the provided URL and returns the data as a promise.
 * @renderChart
 * This function renders a line chart using Chart.js with the provided online data.
 * It creates a gradient background for the chart and configures tooltips to show date and online time in a human-readable format.
 */

let chartInstance = null;
function renderChart(onlineData) {
    const weight = onlineData.map(item => parseFloat(item.decimalMinuteFormatOfOnlineMS));
    const labels = onlineData.map(item => item.date); 
    const readableTimes = onlineData.map(item => item.humanReadableOnline);

    // Destroy the previous chart instance if it exists
    // This is important to avoid memory leaks and ensure the chart is redrawn correctly
    if (chartInstance) {
        chartInstance.destroy();
    }

    const ctx = document.getElementById("canvas").getContext("2d");

    const gradient = ctx.createLinearGradient(0, 25, 0, 300);
    gradient.addColorStop(0, "rgba(0, 200, 83, 0.5)");   
    gradient.addColorStop(0.35, "rgba(0, 200, 83, 0.25)"); 
    gradient.addColorStop(1, "rgba(0, 200, 83, 0)");     


    chartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                fill: true,
                backgroundColor: gradient,
                pointBackgroundColor: "rgba(0, 200, 83, 1)",
                borderColor: "rgba(0, 200, 83, 1)",
                data: weight,
                lineTension: 0.2,
                borderWidth: 2,
                pointRadius: 3
            }]
        },
        options: {
            layout: { padding: 10 },
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        // Show "Date: YYYY-MM-DD"
                        title: (tooltipItems) => {
                            const index = tooltipItems[0].dataIndex;
                            return `Date: ${labels[index]}`;
                        },
                        // Show "Online Time: X.XX mins"
                        label: (tooltipItem) => {
                            const value = tooltipItem.dataIndex;
                            return `Online Time: ${readableTimes[value]}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: "All Time Online Stats"
                    },
                    ticks: {
                        display: false 
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: "Online Time (Decimal Minutes)"
                    },
                    ticks: {
                        beginAtZero: true,
                        padding: 10
                    }
                }
            }
        }
    });
}


function getYesterday() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const yyyy = yesterday.getFullYear();
    const mm = String(yesterday.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
    const dd = String(yesterday.getDate()).padStart(2, '0');

    const formatted = `${yyyy}-${mm}-${dd}`;
    return formatted;
}



function clearLocalStorageExcept(keyToKeep) {
    const keysToRemove = [];
    
    // Collect all keys that need to be removed
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key !== keyToKeep) {
            keysToRemove.push(key);
        }
    }
    
    // Remove the collected keys
    keysToRemove.forEach(key => {
        console.log(`Removing key from localStorage: ${key}`);
        localStorage.removeItem(key);
    });
    
    console.log(`Cleared ${keysToRemove.length} keys from localStorage, kept: ${keyToKeep}`);
}

function msToDecimalMinutes(ms) {
    const seconds = ms / 1000;
    const decimalMinutes = seconds / 60;
    return decimalMinutes.toFixed(2);
}

async function fetchOverAllOnlineDataFromServer(URL){
    try{
        const response = await fetch(URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data //returning promise;
    }catch(error){
        console.error("Error fetching overall online data:", error);
    }
}

document.getElementById("anlysisBtn").addEventListener("click", () => {
    console.log(
        "Analysis button clicked! This is where you can add your analysis logic."
    );
    
    try{
        const URL = "https://leetcode-status-tracker-extension.onrender.com/get-my-online-stats";
        let yesterday = getYesterday(); 
        let localStorageUniqueKey = `Date-${yesterday}`;
        // let keyToRemove = `Date-${getPreviousDayOfYesterday()}`;

        //* clearing all keys except *localStorageUniqueKey*
        clearLocalStorageExcept(localStorageUniqueKey);

        if (localStorage.getItem(localStorageUniqueKey)) {
            const storedData = JSON.parse(localStorage.getItem(localStorageUniqueKey));
            renderChart(storedData);  // << render from localStorage
            return;
        }


        /*
        now here i will check if this uniquelocalstoragekey is already present or not
        If it is present then i will not fetch the data from server
        If it is not present then i will fetch the data from server
        and store it in localStorage with the key as `Date-${yesterday}`
        */ 
        if (localStorage.getItem(localStorageUniqueKey)) {
            console.log(`Data for ${yesterday} already exists in localStorage with key: ${localStorageUniqueKey}`);
            const storedData = JSON.parse(localStorage.getItem(localStorageUniqueKey));
            console.log(`Stored all time online data: `, storedData);
            return; // Exit if data is already present
        }
        else{
            console.log(`No data for ${yesterday} in localStorage, fetching from server...`);
            
            const fetchedData = fetchOverAllOnlineDataFromServer(URL);
            fetchedData.then(data => {
                if (data && data.length > 0) {
                    const onlineData = data.map(item => ({
                        date: item.date,
                        online: item.online,
                        decimalMinuteFormatOfOnlineMS: msToDecimalMinutes(item.online),
                        humanReadableOnline: item.humanReadableOnline
                    }));
                    console.log("Fetched Online Data:", onlineData);
                    //Check for yesterday's data
                    const yesterdayData = onlineData.find(item => item.date === yesterday);
                    if (yesterdayData) {
                        // Store the data in localStorage
                        localStorage.setItem(localStorageUniqueKey, JSON.stringify(onlineData));
                        console.log(`Stored data in localStorage with key: ${localStorageUniqueKey}`);
                        renderChart(onlineData); // render the plot after new fresh data fetch
                    }
                } else {
                    console.log("No data available for the specified date range.");
                }
            });
        }
        
    }catch(error){
        console.error("Error in analysis button click:", error);
    }
});

