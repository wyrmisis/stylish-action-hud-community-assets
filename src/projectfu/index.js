import { createProjectFUAdapter } from "./adapter.js";

Hooks.once("stylish-action-hud.apiReady", (api) => {
  /* === [S001] ProjectFU =================================================== */
  if (api.BaseSystemAdapter) {
    const ProjectFUAdapter = createProjectFUAdapter(api.BaseSystemAdapter);

    api.registerSystemAdapter("projectfu", ProjectFUAdapter, {
      priority: 1,
      source: "stylish-action-hud-community-assets",
      isCompatible: (context) => context.system.id === "projectfu",
    });
  } else {
    console.warn(
      "Stylish Action HUD Community Assets | ProjectFU adapter requires SAH's BaseSystemAdapter API.",
    );
  }

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
