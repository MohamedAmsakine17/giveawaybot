function getTimeLeft(endTime) {
  const now = new Date();
  const timeLeftMillis = endTime - now.getTime();

  // Convert time left to hours, minutes, and seconds
  const hours = Math.floor(timeLeftMillis / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeftMillis % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeftMillis % (1000 * 60)) / 1000);

  // Format the result
  const formattedTime = `${hours <= 0 ? "" : " " + hours + " Hours,"}${
    minutes <= 0 ? "" : " " + minutes + " Minutes,"
  }${seconds <= 0 ? "" : "" + seconds + " Seconds"}`;

  return formattedTime;
}

module.exports = { getTimeLeft };
