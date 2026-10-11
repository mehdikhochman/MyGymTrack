'use client';

import { startTransition, useOptimistic, useRef } from 'react';

// List whose additions and deletions show instantly while the server catches up.
// Deleting a row that is still being saved waits for its real id first.
export function useInstantList<T extends { id: number }>(items: T[]) {
  const hidden = useRef(new Set<number>());
  const saving = useRef(new Map<number, Promise<number>>());
  const nextTempId = useRef(-1);
  const [list, update] = useOptimistic(items, (state, row: T | null) =>
    (row ? [...state, row] : state).filter((x) => !hidden.current.has(x.id)));

  // Call from a form action. `save` returns the new row's id.
  async function add(row: Omit<T, 'id'> | null, save: () => Promise<number>) {
    const id = nextTempId.current--;
    if (row) update({ ...row, id } as T);
    const saved = save();
    saving.current.set(id, saved);
    await saved;
  }

  function remove(id: number, del: (id: number) => Promise<void>, failMessage: string) {
    startTransition(async () => {
      hidden.current.add(id);
      update(null);
      try {
        const realId = id < 0 ? await saving.current.get(id)! : id;
        hidden.current.add(realId);
        await del(realId);
      } catch {
        hidden.current.delete(id);
        alert(failMessage);
      }
    });
  }

  return { list, add, remove };
}
