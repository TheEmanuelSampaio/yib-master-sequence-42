
// This function checks if the current time is allowed based on time restrictions
export const isAllowedByTimeRestriction = (
  timeRestrictions: any[], 
  currentTime: Date
): boolean => {
  // If there are no time restrictions, allow by default
  if (!timeRestrictions || timeRestrictions.length === 0) {
    return true;
  }

  // Current time values
  const currentDay = currentTime.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;

  // Check each time restriction
  for (const restriction of timeRestrictions) {
    // Skip inactive restrictions
    if (!restriction.active) {
      continue;
    }

    // Check if current day is in allowed days
    if (restriction.days && restriction.days.includes(currentDay)) {
      // Calculate start and end times in minutes
      const startTimeMinutes = restriction.start_hour * 60 + restriction.start_minute;
      const endTimeMinutes = restriction.end_hour * 60 + restriction.end_minute;

      // Check if current time is within allowed range
      if (currentTimeMinutes >= startTimeMinutes && currentTimeMinutes <= endTimeMinutes) {
        // Found at least one restriction where current time is allowed
        return true;
      }
    }
  }

  // If we get here, no time restriction allows the current time
  return false;
};
