const CATEGORY_KEYS = {
  ABILITY_SCORES: "abilityscore",
  SAVING_THROWS: "savingthrow",
};

export class MoShAdapter {
  constructor() {
    this.systemId = "ars";
  }

  getStats(actor, configAttributes) {
    if (!configAttributes || configAttributes.length === 0) return [];

    return configAttributes.map((attr) => {
      let value =
        foundry.utils.getProperty(
          actor,
          attr.style === "number" || attr.style === "badge" || attr.maxPath
            ? attr.path
            : `${attr.path}.value`,
        ) ?? 0;

      const max =
        foundry.utils.getProperty(
          actor,
          attr.maxPath ? attr.maxPath : `${attr.path}.max`,
        ) ?? 0;
      const percent = Math.clamp((value / (max || 1)) * 100, 0, 100);

      return {
        ...attr,
        value: value,
        max: max,
        percent: percent,
        style: attr.style || "bar",
        subtype: "resource",
        x: attr.x || 0,
        y: attr.y || 0,
      };
    });
  }

  getConditions(actor) {
    const effects = actor.temporaryEffects || [];

    return effects
      .map((e) => ({
        id: e.id || e.flags?.core?.statusId || e.name || "unknown",
        src: e.icon,
        name: e.name || e.label || "Unknown",
        value: e.value ?? null,
      }))
      .filter((c) => c.src);
  }

  /**
   * @todo Add "actions" for a character's available action groups
   */
  getActionCategories(actor) {
    return [
      actor.items.find((i) => i.type === "weapon")
        ? {
            id: "equippedWeapons",
            label: game.i18n.localize("Mosh.Weapons"),
            icon: "fa fa-gun",
            type: "submenu",
          }
        : null,
      {
        id: "abilityChecks",
        label: game.i18n.localize("SAHCommunityAssets.Mosh.MenuOptions.Stats"),
        icon: "fa fa-child",
        type: "submenu",
      },
      {
        id: "savingThrows",
        label: game.i18n.localize("SAHCommunityAssets.Mosh.MenuOptions.Saves"),
        icon: "fa fa-shield-alt",
        type: "submenu",
      },
      actor.items.filter((i) => i.type !== "weapon").length
        ? {
            id: "items",
            label: game.i18n.localize("Mosh.Items"),
            icon: "fa fa-bolt",
            type: "submenu",
          }
        : null,
    ].filter((i) => !!i);
  }

  async getSubMenuData(actor, categoryId) {
    return await this.#getSystemSubMenuData(actor, categoryId);
  }

  async #getSystemSubMenuData(actor, systemId) {
    switch (systemId) {
      case "equippedWeapons":
        return this.#getWeapons(actor);
      case "abilityChecks":
        return this.#getAbilityScoreChecks(actor);
      case "savingThrows":
        return this.#getSavingThrows(actor);
      case "items":
        return this.#getItems(actor);
      // case "preparedSpells":
      //   return this.#getSpells(actor);
      default:
        return { title: menuData.label, items: [] };
    }
  }

  #getAbilityScoreChecks(actor) {
    return {
      title: "Stats",
      theme: "red",
      items: ["strength", "speed", "intellect", "combat"].map((i) => ({
        id: `${CATEGORY_KEYS.ABILITY_SCORES}.${i.toLowerCase()}`,
        name: game.i18n.localize(`Mosh.${i[0].toUpperCase() + i.slice(1)}`),
        cost: `<span class="ib-font-hero">${actor.system.stats[i].value}</span>`,
        favoritable: false,
      })),
    };
  }
  #getSavingThrows(actor) {
    return {
      title: "Saves",
      theme: "red",
      items: ["sanity", "fear", "body"].map((i) => ({
        id: `${CATEGORY_KEYS.SAVING_THROWS}.${i}`,
        name: game.i18n.localize(`Mosh.${i[0].toUpperCase() + i.slice(1)}`),
        cost: `<span class="ib-font-hero">${actor.system.stats[i].value}</span>`,
        favoritable: false,
      })),
    };
  }

  /**
   * TODO: Exhaust Items with ammo costs
   * TODO: Exhaust Actions with per-whatever-time-unit uses
   */
  #getWeapons(actor) {
    const items = [];

    actor.items.forEach((i) => {
      if (i.type !== "weapon") return;

      items.push({
        id: i.id,
        name: i.name,
        img: i.img,
        description: i.system.description || "",
        // cost,
        // isExhausted,
      });
    });

    return {
      title: "Weapons",
      theme: "red",
      items,
    };
  }

  /**
   * TODO: Exhaust Items with ammo costs
   * TODO: Exhaust Actions with per-whatever-time-unit uses
   */
  #getItems(actor) {
    const items = [];

    actor.items
      .filter((i) => i.type === "item")
      .forEach((i) => {
        items.push({
          id: i.id,
          name: i.name,
          img: i.img,
          description: i.system.description || "",
        });
      });

    return {
      title: "Items",
      theme: "red",
      items,
    };
  }

  updateAttribute(actor, path, input) {}

  /**
   *
   */
  removeCondition(actor, conditionId) {}

  /**
   * @todo Why did we need this again?
   */
  executeAction(actor, actionId) {
    const [type, action] = actionId.split(".");
    if (type === "action") {
      this.#handleAction(actor, action);
    }
  }

  /**
   *
   */
  #handleAction(actor, action) {}

  /**
   *
   */
  async useItem(actor, id) {
    // === It's an ability score check "item" ==================================
    if (id.startsWith(CATEGORY_KEYS.ABILITY_SCORES))
      return this.#rollAbilityScore(actor, id);

    // === It's a saving throw "item" ==========================================
    if (id.startsWith(CATEGORY_KEYS.SAVING_THROWS))
      return this.#rollSave(actor, id);

    // === It's an actual item! ================================================
    const item = actor.items.get(id);

    // --- It's a weapon; attack with it. --------------------------------------
    if (item.type === "weapon") {
      return actor.rollCheck(null, "low", "combat", null, null, item);
    }

    // --- Some other sort of item. --------------------------------------------
    actor.printDescription(item.id, {});
  }

  #rollAbilityScore(actor, id) {
    actor.rollCheck(null, "low", id.split(".")[1], null, null, null);
  }
  #rollSave(actor, id) {
    actor.rollCheck(null, "low", id.split(".")[1], null, null, null);
  }

  getResourceForEdit(actor, itemId) {
    actor.items.get(itemId)?.sheet?.render(true);
  }

  getTrackableAttributes(actor) {
    const paths = [];

    paths.push({ path: "system.resources.hp", label: "Hit Points (HP)" });

    return paths;
  }

  getDefaultAttributes() {
    return [
      {
        path: "system.health",
        label: game.i18n.localize("Mosh.Health"),
        icon: "fa fa-heart",
        color: "#e5292c",
        style: "bar",
        compactVisible: true,
        hitFeedback: true,
      },
      {
        path: "system.hits",
        label: game.i18n.localize("Mosh.Wounds"),
        icon: "fa fa-heart-broken",
        color: "#e5292c",
        style: "text",
        hitFeedback: true,
      },
      {
        path: "system.stats.armor.total",
        icon: "fa fa-shield-alt",
        label: game.i18n.localize("Mosh.Armor"),
        style: "badge",
        color: "#ffffff",
        hitFeedback: false,
      },
      {
        path: "system.other.stress",
        icon: "fa fa-wave-pulse",
        color: "#7ca6a8",
        label: game.i18n.localize("Mosh.Stress"),
        style: "bar",
        compactVisible: true,
        hitFeedback: true,
      },
    ];
  }
  getDefaultStatusEffects() {
    // The shape of a status effect entry:
    //   {
    //   id: "bleeding",
    //   label: game.i18n.localize("IBHUD.Status.Bleeding"),
    //   filters: {
    //     grayscale: 0,
    //     brightness: 90,
    //     contrast: 120,
    //     blur: 0,
    //     saturate: 80,
    //     sepia: 0,
    //   },
    //   overlayPath: "icons/svg/blood.svg",
    //   overlayScale: 1.2,
    //   overlayX: 0,
    //   overlayY: 0,
    //   overlayOpacity: 0.4,
    //   overlayBlend: "multiply",
    //   animation: "heartbeat",
    //   tintColor: "#880000",
    //   tintAlpha: 0.3,
    //   tintAnimation: "heartbeat",
    // },
    return [];
  }

  isStatRollable(path) {
    return false;
  }

  rollStat(actor, path, _event) {
    return false;
  }
}
