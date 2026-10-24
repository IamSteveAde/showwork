/** Merge confirmed saves into the calendar without duplicating posts that a
 * background refresh already loaded. Keep distinct platform posts separate. */
export function mergeSavedCalendarPosts<T extends { id: string }>(
  current: readonly T[],
  saved: readonly T[],
): T[] {
  const byId = new Map(current.map(post => [post.id, post]));
  for (const post of saved) byId.set(post.id, post);
  return [...byId.values()];
}
