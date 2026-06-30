import { ARSAdapter } from "./adapter.js";

Hooks.once("stylish-action-hud.apiReady", (api) => {
  api.registerSystemAdapter("ars", ARSAdapter, {
    priority: 1,
    source: "stylish-action-hud-ars",
    isCompatible: (context) => context.system.id === "ars",
  });
});
