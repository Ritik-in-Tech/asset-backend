export function getCurrentIndianTime() {
  // Get current date and time in UTC
  let currentDate = new Date();

  // Get UTC time in milliseconds
  let utcTime = currentDate.getTime();

  // Indian Standard Time (IST) is UTC+5:30
  let istOffset = 5.5 * 60 * 60 * 1000;

  // Convert UTC time to IST time
  let istTime = new Date(utcTime + istOffset);

  return new Date();
}

export function getCurrentUTCTime() {
  return new Date();
}
