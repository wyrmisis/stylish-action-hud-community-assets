export class ProjectFUAdapter {
  constructor() {
    this.systemId = "projectfu";
  }
  // Class Features to be excluded from the Skills menu
  static exclusionList = ["tone", "key", "ingredient", "garden"];
	
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
   * @todo If an actor isn't a spellcaster, don't include spells
   */
  getActionCategories(actor) {
    return [
      {
        id: "action.attack",
        label: game.i18n.localize("FU.Attack"),
        icon: "ra ra-crossed-swords",
        type: "system",
      },
      actor.itemTypes.skill.length
        ? {
            id: "skills",
            systemId: "skills",
            label: game.i18n.localize("FU.Skill"),
            description: game.i18n.localize("FU.SkillRule"),
            icon: "ra ra-trophy",
            type: "submenu",
          }
        : null,
      actor.itemTypes.spell.length
        ? {
            id: "spells",
            systemId: "spells",
            label: game.i18n.localize("FU.Spell"),
            icon: "ra ra-crystal-wand",
            type: "submenu",
          }
        : null,
      actor.itemTypes.consumable.length
        ? {
            id: "items",
            systemId: "items",
            label: game.i18n.localize("FU.Inventory"),
            icon: "ra ra-ammo-bag",
            type: "submenu",
          }
        : null,
      {
        id: "action.guard",
        label: game.i18n.localize("FU.Guard"),
        icon: "ra ra-shield",
        type: "system",
      },
      {
        id: "action.study",
        label: game.i18n.localize("FU.Study"),
        icon: "ra ra-book",
        type: "system",
      },
      {
        id: "action.hinder",
        label: game.i18n.localize("FU.Hinder"),
        icon: "ra ra-interdiction",
        type: "system",
      },
      {
        id: "action.objective",
        label: game.i18n.localize("FU.Objective"),
        icon: "ra ra-targeted",
        type: "system",
      },
    ].filter((i) => !!i);
  }

  /**
   * Get submenu data for a category
   * @param {Actor} actor
   * @param {String} categoryId
   * @returns {Object} - {title, items, hasTabs, tabLabels, ...}
   */
  async getSubMenuData(actor, categoryId) {
    // // Parse category index
    // const parts = categoryId.split("-");
    // const index = parseInt(parts[parts.length - 1]);

    // // Get category definition
    // const categories = this.getActionCategories(actor);
    // const category = categories[index];

    // if (!category?.systemId) {
    //   return { title: "", items: [] };
    // }

    // return await this.#getSystemSubMenuData(actor, category.systemId, category);
    return await this.#getSystemSubMenuData(actor, categoryId);
  }

  /**
   * Internal: Load system-specific submenu data
   * @todo Add skills
   * @todo Add
   */
  async #getSystemSubMenuData(actor, systemId) {
    switch (systemId) {
      case "skills":
        return this.#getSkills(actor);
      case "items":
        return this.#getConsumables(actor);
      case "spells":
        return this.#getSpells(actor);
      default:
        return { title: menuData.label, items: [] };
    }
  }

  #checkForAdequateResources(actor, item) {
	if (!item.system.cost) return false;
    const costValue = parseInt(item.system.cost.amount);

    if (isNaN(costValue)) return false;

    const totalResourceCost =
      costValue *
      (item.system.cost.perTarget ? Math.max(game.user.targets.size, 1) : 1);

    return (
      actor.system.resources[item.system.cost.resource].value <
      totalResourceCost
    );
  }

  #generateCostString(item) {
    const abbreviatedResource = game.i18n.localize(
      CONFIG.FU.resourcesAbbr[item.system.cost.resource],
    );
    const perTargetAbbreviation = item.system.cost.perTarget
      ? " " + game.i18n.localize("FU.CostPerTargetAbbreviation")
      : "";

    return `${item.system.cost.amount} ${abbreviatedResource}${perTargetAbbreviation}`;
  }

  #getSkills(actor) {
    const items = { all: [] };
    const primaryLabels = [];

    actor.itemTypes.skill.forEach((i) => {
      const isExhausted = this.#checkForAdequateResources(actor, i);
      const cost = i.system.cost.amount ? this.#generateCostString(i) : null;
      const className = i.system.class.value;

      primaryLabels.push(className);
      if (!items[className]) items[className] = [];

      const item = {
        id: i.id,
        name: i.name,
        img: i.img,
        description: i.system.description || "",
        cost,
        isExhausted,
      };

      items.all.push(item);
      items[className].push(item);
    });

	actor.itemTypes.classFeature.forEach((i) => {
      const isExhausted = this.#checkForAdequateResources(actor, i);
      const cost = i.system.cost?.amount ? this.#generateCostString(i) : null;
      const className = i.system.featureType.split('.')[1];

	  if (exclusionList.includes(className)) return;

      primaryLabels.push(className);
      if (!items[className]) items[className] = [];

      const item = {
        id: i.id,
        name: i.name,
        img: i.img,
        description: i.system.description || "",
        cost,
        isExhausted,
      };

      items.all.push(item);
      items[className].push(item);
    });

	actor.itemTypes.optionalFeature.forEach((i) => {
      const isExhausted = this.#checkForAdequateResources(actor, i);
      const cost = i.system.cost?.amount ? this.#generateCostString(i) : null;
      const className = i.system.optionalType.split('.')[1];

	  if (exclusionList.includes(className)) return;

      primaryLabels.push(className);
      if (!items[className]) items[className] = [];

	  let desc = i.system.description || "";

	  if (className == "zeroPower") {
		  desc = `<h3>${i.system.data.zeroTrigger.value ?? "Zero Trigger"}</h3>
		  ${i.system.data.zeroTrigger.description ?? ""}
		  <hr>
		  <h3>${i.system.data.zeroEffect.value ?? "Zero Effect"}</h3>
		  ${i.system.data.zeroEffect.description ?? ""}`;
	  };

      const item = {
        id: i.id,
        name: i.name,
        img: i.img,
        description: desc,
        cost,
        isExhausted,
      };

      items.all.push(item);
      items[className].push(item);
    });

    return {
      title: "Skills",
      theme: "red",
      hasTabs: true,
      tabLabels: [...new Set(primaryLabels)],
      // tabTooltips: primaryTooltips,
      items,
      // hasSubTabs: true,
      // subTabLabels: subLabels,
    };
  }

  #getSpells(actor) {
    const items = actor.itemTypes.spell.map((i) => {
      const isExhausted = this.#checkForAdequateResources(actor, i);
      const cost = i.system.cost.amount ? this.#generateCostString(i) : null;

      return {
        id: i.id,
        name: i.name,
        img: i.img,
        description: i.system.description || "",
        cost,
        isExhausted,
      };
    });
    return {
      title: "Spells",
      theme: "red",
      // hasTabs: true,
      // hasSubTabs: true,
      items,
      // tabLabels: primaryLabels,
      // tabTooltips: primaryTooltips,
      // subTabLabels: subLabels,
    };
  }

  #getConsumables(actor) {
    const items = actor.itemTypes.consumable.map((i) => {
      const syntheticCostObj = {
        system: {
          cost: {
            resource: "ip",
            amount: i.system.ipCost.value,
          },
        },
      };
      const isExhausted = this.#checkForAdequateResources(
        actor,
        syntheticCostObj,
      );
      const cost = syntheticCostObj.system.cost.amount
        ? this.#generateCostString(syntheticCostObj)
        : null;

      return {
        id: i.id,
        name: i.name,
        img: i.img,
        description: i.system.description || "",
        cost,
        isExhausted,
      };
    });

    // const items = actor.itemTypes.consumable.map((i) => ({
    //   id: i.id,
    //   name: i.name,
    //   img: i.img,
    //   description: i.system.description || "",
    // }));

    return {
      title: "Items",
      theme: "red",
      // hasTabs: true,
      // hasSubTabs: true,
      items,
      // tabLabels: primaryLabels,
      // tabTooltips: primaryTooltips,
      // subTabLabels: subLabels,
    };
  }

  updateAttribute(actor, path, input) {}
  removeCondition(actor, conditionId) {}
  executeAction(actor, actionId) {
    const [type, action] = actionId.split(".");
    console.info(actor, actionId);
    if (type === "action") {
      this.#handleAction(actor, action);
    }
  }

  #handleAction(actor, action) {
    if (action === "study")
      return new projectfu.StudyRollHandler(actor).handleStudyRoll();
    else return new projectfu.ActionHandler(actor).handleAction(action, false);
  }

  useItem(actor, itemId) {
    actor.items.get(itemId).roll();
  }
  getResourceForEdit(actor, itemId) {
    actor.items.get(itemId)?.sheet?.render(true);
  }

  getTrackableAttributes(actor) {
    const paths = [];
    const system = actor.system;

    paths.push({ path: "system.resources.hp", label: "Hit Points (HP)" });
    paths.push({ path: "system.resources.mp", label: "Mind Points (MP)" });
    paths.push({ path: "system.resources.ip", label: "Inventory Points (IP)" });

    paths.push({
      path: "system.resources.fp",
      label: "Fabula Points (FP)",
      style: "number",
      icon: "fas fa-sparkle",
      color: "#ffd166",
      textColor: "#000000",
      textStrokeColor: "#ffffff",
    });

    return paths;
  }

  getDefaultAttributes() {
    return [
      {
        path: "system.resources.hp",
        label: "HP",
        icon: "fu-icon--s fu-hp",
        color: "#17b924",
        style: "bar",
      },
      {
        path: "system.resources.mp",
        icon: "fu-icon--s fu-mp",
        label: "MP",
        color: "#16aad6",
        style: "bar",
      },
      {
        path: "system.resources.ip",
        icon: "fu-icon--s fu-ip",
        label: "IP",
        color: "#d68931",
        style: "bar",
      },
      {
        path: "system.resources.fp.value",
        icon: "fu-icon--s fu-fp",
        label: "FP",
        textColor: "#ffffff",
        style: "badge",
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
    return [
      {
        id: "accelerated",
        label: game.i18n.localize("FU.Accelerated"),
        overlayPath:
          "systems/projectfu/styles/static/statuses/Accelerated.webp",
      },
      {
        id: "aura",
        label: game.i18n.localize("FU.Aura"),
        overlayPath: "systems/projectfu/styles/static/statuses/Aura.webp",
      },
      {
        id: "barrier",
        label: game.i18n.localize("FU.Barrier"),
        overlayPath: "systems/projectfu/styles/static/statuses/Barrier.webp",
      },
      {
        id: "cover",
        label: game.i18n.localize("FU.Cover"),
        overlayPath: "systems/projectfu/styles/static/statuses/Cover.webp",
      },
      {
        id: "dazed",
        label: game.i18n.localize("FU.Dazed"),
        overlayPath: "systems/projectfu/styles/static/statuses/Dazed.webp",
      },
      {
        id: "dex-down",
        label: game.i18n.localize("FU.DEXDown"),
        overlayPath: "systems/projectfu/styles/static/statuses/DexDown.webp",
      },
      {
        id: "dex-up",
        label: game.i18n.localize("FU.DEXUp"),
        overlayPath: "systems/projectfu/styles/static/statuses/DexUp.webp",
      },
      {
        id: "enraged",
        label: game.i18n.localize("FU.Enraged"),
        overlayPath: "systems/projectfu/styles/static/statuses/Enraged.webp",
      },
      {
        id: "flying",
        label: game.i18n.localize("FU.Flying"),
        overlayPath: "systems/projectfu/styles/static/statuses/Flying.webp",
      },
      {
        id: "guard",
        label: game.i18n.localize("FU.Guard"),
        overlayPath: "systems/projectfu/styles/static/statuses/Guard.webp",
      },
      {
        id: "ins-down",
        label: game.i18n.localize("FU.INSDown"),
        overlayPath: "systems/projectfu/styles/static/statuses/InsDown.webp",
      },
      {
        id: "ins-up",
        label: game.i18n.localize("FU.INSUp"),
        overlayPath: "systems/projectfu/styles/static/statuses/InsUp.webp",
      },
      {
        id: "ko",
        label: game.i18n.localize("FU.KO"),
        overlayPath: "systems/projectfu/styles/static/statuses/KO.webp",
      },
      {
        id: "mig-down",
        label: game.i18n.localize("FU.MIGDown"),
        overlayPath: "systems/projectfu/styles/static/statuses/MigDown.webp",
      },
      {
        id: "mig-up",
        label: game.i18n.localize("FU.MIGUp"),
        overlayPath: "systems/projectfu/styles/static/statuses/MigUp.webp",
      },
      {
        id: "provoked",
        label: game.i18n.localize("FU.Provoked"),
        overlayPath: "systems/projectfu/styles/static/statuses/Provoked.webp",
      },
      {
        id: "reflect",
        label: game.i18n.localize("FU.Reflect"),
        overlayPath: "systems/projectfu/styles/static/statuses/Reflect.webp",
      },
      {
        id: "regen",
        label: game.i18n.localize("FU.Regen"),
        overlayPath: "systems/projectfu/styles/static/statuses/Regen.webp",
      },
      {
        id: "shaken",
        label: game.i18n.localize("FU.Shaken"),
        overlayPath: "systems/projectfu/styles/static/statuses/Shaken.webp",
      },
      {
        id: "sleep",
        label: game.i18n.localize("FU.Sleep"),
        overlayPath: "systems/projectfu/styles/static/statuses/Sleep.webp",
      },
      {
        id: "slow",
        label: game.i18n.localize("FU.Slow"),
        overlayPath: "systems/projectfu/styles/static/statuses/Slow.webp",
      },
      {
        id: "poisoned",
        label: game.i18n.localize("FU.Poisoned"),
        overlayPath: "systems/projectfu/styles/static/statuses/Poisoned.webp",
      },
      {
        id: "weak",
        label: game.i18n.localize("FU.Weak"),
        overlayPath: "systems/projectfu/styles/static/statuses/Weak.webp",
      },
      {
        id: "wlp-down",
        label: game.i18n.localize("FU.WLPDown"),
        overlayPath: "systems/projectfu/styles/static/statuses/WlpDown.webp",
      },
      {
        id: "wlp-up",
        label: game.i18n.localize("FU.WLPUp"),
        overlayPath: "systems/projectfu/styles/static/statuses/WlpUp.webp",
      },
      {
        id: "crisis",
        label: game.i18n.localize("FU.Crisis"),
        overlayPath: "systems/projectfu/styles/static/statuses/Crisis.webp",
        filters: {
          grayscale: 0,
          brightness: 90,
          contrast: 120,
          blur: 0,
          saturate: 80,
          sepia: 0,
        },
        overlayScale: 1.2,
        overlayX: 0,
        overlayY: 0,
        overlayOpacity: 0.4,
        overlayBlend: "multiply",
        animation: "heartbeat",
        tintColor: "#880000",
        tintAlpha: 0.3,
        tintAnimation: "heartbeat",
      },
      {
        id: "focus",
        label: game.i18n.localize("FU.Focus"),
        overlayPath: "systems/projectfu/styles/static/statuses/Focus.png",
      },
      {
        id: "pressure",
        label: game.i18n.localize("FU.Pressure"),
        overlayPath: "systems/projectfu/styles/static/statuses/Pressure.png",
      },
      {
        id: "stagger",
        label: game.i18n.localize("FU.Stagger"),
        overlayPath: "systems/projectfu/styles/static/statuses/Stagger.webp",
      },
    ];
  }

  isStatRollable(path) {
    if (path === "system.resources.fp") return true;
    // if (path.includes("system.resources")) return false;
    return false;
  }

  rollStat(actor, path, _event) {
    if (path === "system.resources.fp") return this.#spendFabulaPoint(actor);
  }

  /**
   * Snagged from the projectfu system's metacurrency code.
   * @todo see if they'd be willing to add a hook for spending metacurrency, or some other interface for doing this from outside of the system.
   */
  async #spendFabulaPoint(actor, force = false) {
    if (!actor) {
      return false;
    }
    let metaCurrency;
    if (actor.type === "character") {
      metaCurrency = game.i18n.localize("FU.Fabula");
    }
    if (actor.type === "npc" && actor.system.villain.value) {
      metaCurrency = game.i18n.localize("FU.Ultima");
    }
    if (metaCurrency && actor.system.resources.fp.value > 0) {
      const confirmed =
        force ||
        (await foundry.applications.api.DialogV2.confirm({
          window: {
            title: game.i18n.format("FU.UseMetaCurrencyDialogTitle", {
              type: metaCurrency,
            }),
          },
          content: game.i18n.format("FU.UseMetaCurrencyDialogMessage", {
            type: metaCurrency,
          }),
          options: {
            classes: [
              "projectfu",
              "unique-dialog",
              "dialog-reroll",
              "backgroundstyle",
            ],
          },
          rejectClose: false,
        }));
      if (confirmed && actor.system.resources.fp.value > 0) {
        /** @type ChatMessageData */
        const data = {
          speaker: ChatMessage.implementation.getSpeaker({ actor: actor }),
          flavor: game.i18n.format("FU.UseMetaCurrencyChatFlavor", {
            type: metaCurrency,
          }),
          content: game.i18n.format("FU.UseMetaCurrencyChatMessage", {
            actor: actor.name,
            type: metaCurrency,
          }),
          flags: {
            [game.system.id]: {
              UseMetaCurrency: true,
            },
          },
        };
        ChatMessage.create(data);
        await actor.update({
          "system.resources.fp.value": actor.system.resources.fp.value - 1,
        });
        return true;
      }
    } else {
      ui.notifications.info(
        game.i18n.format("FU.UseMetaCurrencyNotificationInsufficientPoints", {
          actor: actor.name,
          type: metaCurrency,
        }),
      );
      return false;
    }
  }
}
