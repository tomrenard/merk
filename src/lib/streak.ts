/** Consecutive days ending today, or yesterday when today has no review yet. Days are YYYY-MM-DD, newest first. */
export function streakLength(days: string[], today: string | undefined): number {
  if (!today) return 0;
  const shift = (day: string, by: number) =>
    new Date(Date.parse(`${day}T00:00:00Z`) + by * 86_400_000).toISOString().slice(0, 10);
  let expected = days[0] === today ? today : shift(today, -1);
  let streak = 0;
  for (const day of days) {
    if (day !== expected) break;
    streak++;
    expected = shift(expected, -1);
  }
  return streak;
}
