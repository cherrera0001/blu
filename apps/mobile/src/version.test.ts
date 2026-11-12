import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { APP_VERSION, APP_VERSION_CODE } from "./version";

describe("versión móvil", () => {
  it("alineada con package.json y app.json", () => {
    const root = join(__dirname, "..");
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
      version: string;
    };
    const app = JSON.parse(readFileSync(join(root, "app.json"), "utf8")) as {
      expo: { version: string; android: { versionCode: number } };
    };
    expect(APP_VERSION).toBe("0.3.1");
    expect(APP_VERSION).toBe(pkg.version);
    expect(APP_VERSION).toBe(app.expo.version);
    expect(APP_VERSION_CODE).toBe(app.expo.android.versionCode);
  });
});
