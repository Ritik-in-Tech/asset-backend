export function getCurrentIndianTime() {
  // IST is UTC + 5:30
  const now = new Date();
  now.setMinutes(now.getMinutes() + now.getTimezoneOffset() + 330); // 330 minutes = 5.5 hours
  return now;
}

export function getCurrentUTCTime() {
  return new Date();
}
