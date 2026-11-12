import { BLU_HERMES_HARDENED } from "./src/polyfill";
import { registerRootComponent } from "expo";
import App from "./App";

// Impide que Metro elimine el polyfill por tree-shaking.
if (!BLU_HERMES_HARDENED) {
  throw new Error("blu_hermes_polyfill_missing");
}

registerRootComponent(App);
