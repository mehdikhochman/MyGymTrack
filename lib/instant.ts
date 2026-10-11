// Sessions deleted on this device: hidden from lists at once. The history page sends the delete,
// because a server action started during a navigation would hold that navigation until it finishes.
export const deletedSessions = new Set<number>();
export const unsentDeletes = new Set<number>();
