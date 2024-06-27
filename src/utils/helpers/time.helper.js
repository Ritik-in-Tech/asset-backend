export function getCurrentIndianTime() {
  // IST is UTC + 5:30
  const now = new Date();
  now.setMinutes(now.getMinutes() + now.getTimezoneOffset() + 330); // 330 minutes = 5.5 hours
  return now;
}

export function getCurrentUTCTime() {
  return new Date();
}

export function getCurrentIndianTimeRealtime() {
  return new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}
