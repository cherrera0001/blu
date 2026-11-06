import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

describe("Blu official visual system", () => {
  it("uses the documented official brand tokens", () => {
    expect(styles).toMatch(/--blu-deep:\s*#12324f/i);
    expect(styles).toMatch(/--blu-blue:\s*#2f8fbf/i);
    expect(styles).toMatch(/--blu-sky:\s*#6ec8f0/i);
    expect(styles).toMatch(/--blu-foam:\s*#e8f7ff/i);
  });

  it("keeps the dashboard hero on the official palette and compact", () => {
    const hero = styles.match(/\.dashboard-hero\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(hero).not.toMatch(/#(?:173f39|20534a|2e6253)/i);
    expect(hero).toMatch(/var\(--blu-(?:foam|sky|glow|blue)\)/i);
    expect(hero).not.toMatch(/min-height:\s*660px/i);
  });

  it("hides the skip link until it receives keyboard focus", () => {
    expect(styles).toMatch(/\.skip-link:not\(:focus-visible\)\s*\{/);
    expect(styles).toMatch(/\.skip-link:focus-visible\s*\{/);
  });
});
