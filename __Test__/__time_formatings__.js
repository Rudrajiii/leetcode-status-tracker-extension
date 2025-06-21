const ms = 193302;
const seconds = ms / 1000;
console.log(seconds);  // 193.302 seconds

const totalSeconds = Math.floor(seconds);       // 193
const minutes = Math.floor(totalSeconds / 60);  // 3
const secs = totalSeconds % 60;                 // 13



const decimalMinutes = seconds / 60;
console.log(decimalMinutes.toFixed(2));  // "3.22" minutes

const totalMins = Math.floor(decimalMinutes);   // 3
const hrs = Math.floor(totalMins / 60);         // 0
const mins = totalMins % 60;                    // 3

console.log(`${hrs} hour(s) and ${mins} minute(s)`);  // "0 hour(s) and 3 minute(s)"

function msToDecimalMinutes(ms) {
    const seconds = ms / 1000;
    const decimalMinutes = seconds / 60;
    return decimalMinutes.toFixed(2);
}