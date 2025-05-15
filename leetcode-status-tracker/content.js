function handleVisibilityChange() {
  chrome.storage.local.get(['toggleCheckButton'], (result) => {
    if (result.toggleCheckButton && document.visibilityState === 'hidden') {
      alert("Stay focused! You're switching away from LeetCode.");
    }
  });
}

document.addEventListener("visibilitychange", handleVisibilityChange);
