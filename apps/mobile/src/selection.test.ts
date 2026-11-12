import { describe, expect, it } from "vitest";
import { HABITS, MAX_SELECTED_HABITS, type HabitId } from "blu-core/blu";
import { toggleHabitSelection } from "./selection";

describe("toggleHabitSelection", () => {
  it("expone exactamente 7 temas en el núcleo compartido", () => {
    expect(HABITS).toHaveLength(7);
    expect(MAX_SELECTED_HABITS).toBe(4);
  });

  it("añade hasta el tope de 4", () => {
    let draft: HabitId[] = [];
    for (const habit of HABITS.slice(0, 4)) {
      const result = toggleHabitSelection(draft, habit.id);
      expect(result.blocked).toBe(false);
      draft = result.next;
    }
    expect(draft).toHaveLength(4);

    const blocked = toggleHabitSelection(draft, HABITS[4].id);
    expect(blocked.blocked).toBe(true);
    expect(blocked.next).toEqual(draft);
    expect(blocked.message).toMatch(/hasta 4/);
  });

  it("quita un tema al volver a marcarlo", () => {
    const first = HABITS[0].id;
    const withOne = toggleHabitSelection([], first).next;
    const cleared = toggleHabitSelection(withOne, first);
    expect(cleared.next).toEqual([]);
    expect(cleared.blocked).toBe(false);
  });
});
