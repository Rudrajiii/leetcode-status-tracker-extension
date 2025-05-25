function handleVisibilityChange() {
  chrome.storage.local.get(['toggleCheckButton'], (result) => {
    console.log("toggle checkButton:", result.toggleCheckButton);
    if (chrome.runtime.lastError) {
        console.error("Storage get error:", chrome.runtime.lastError);
        return;
    }
    if (result.toggleCheckButton && document.visibilityState === 'hidden') {
      alert("Stay focused! You're switching away from LeetCode.");
    }
  });
}

document.addEventListener("visibilitychange", handleVisibilityChange);
