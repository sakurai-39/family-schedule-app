export function isInPast(date: Date): boolean {
  return date.getTime() < Date.now();
}
