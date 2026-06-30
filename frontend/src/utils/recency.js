// Shared "recently added" helpers used by the Listings table and Tracker cards,
// so the "New" window stays consistent across the app.
export const NEW_DAYS = 14;

export function daysSince(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr)) / 86400000);
}

export function isNew(dateStr) {
  const age = daysSince(dateStr);
  return age != null && age <= NEW_DAYS;
}

export function formatShortDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
