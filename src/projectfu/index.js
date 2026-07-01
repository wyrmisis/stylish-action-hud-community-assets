import { ProjectFUAdapter } from "./adapter.js";

Hooks.once("stylish-action-hud.apiReady", (api) => {
  /* === [S001] ProjectFU =================================================== */
  api.registerSystemAdapter("projectfu", ProjectFUAdapter, {
    priority: 1,
    source: "stylish-action-hud-community-assets",
    isCompatible: (context) => context.system.id === "projectfu",
  });

  api.registerTheme("projectfu", {
    label: "ProjectFU",
    defaults: {
      scale: 1,
      format: "box",
      nameZ: 5,
      barsZ: 5,
      dotsZ: 5,
      numbersZ: 5,
      badgesZ: 150,
    },
    sounds: {
      click: "sounds/notify.wav",
      hover: "sounds/click.wav",
    },
  });

  /* === Add more! ========================================================== */
});
