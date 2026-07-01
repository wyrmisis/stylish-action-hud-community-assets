import { MoShAdapter } from "./adapter.js";

Hooks.once("stylish-action-hud.apiReady", (api) => {
  api.registerSystemAdapter("mosh", MoShAdapter, {
    priority: 1,
    source: "stylish-action-hud-community-assets",
    isCompatible: (context) => context.system.id === "mosh",
  });
});
