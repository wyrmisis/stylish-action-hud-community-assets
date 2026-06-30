const CATEGORY_KEYS = {
  ABILITY_SCORES: "abilityscore",
  SAVING_THROWS: "savingthrow",
};

export class ARSAdapter {
  constructor() {
    this.systemId = "ars";
  }

  getStats(actor, configAttributes) {
    if (!configAttributes || configAttributes.length === 0) return [];

    return configAttributes.map((attr) => {
      let value =
        foundry.utils.getProperty(
          actor,
          attr.maxPath ? attr.path : `${attr.path}.value`,
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
      this.#hasEquippedWeapons(actor)
        ? {
            id: "equippedWeapons",
            label: game.i18n.localize(
              "SAHCommunityAssets.ARS.MenuOptions.Attack",
            ),
            icon: "fa fa-swords",
            type: "submenu",
          }
        : null,
      {
        id: "abilityChecks",
        label: game.i18n.localize(
          "SAHCommunityAssets.ARS.MenuOptions.AbilityChecks",
        ),
        icon: "fa fa-child",
        type: "submenu",
      },
      {
        id: "savingThrows",
        label: game.i18n.localize(
          "SAHCommunityAssets.ARS.MenuOptions.SavingThrows",
        ),
        icon: "fa fa-shield-alt",
        type: "submenu",
      },
      // {
      //   id: "actions",
      //   label: game.i18n.localize("SAHCommunityAssets.ARS.MenuOptions.Actions"),
      //   icon: "fa fa-bolt",
      //   type: "submenu",
      // },
      actor.skills.length
        ? {
            id: "skills",
            label: game.i18n.localize(
              "SAHCommunityAssets.ARS.MenuOptions.Skills",
            ),
            icon: "fa fa-person-limbs-wide",
            type: "submenu",
          }
        : null,
      actor.spells.length
        ? {
            id: "preparedSpells",
            label: game.i18n.localize(
              "SAHCommunityAssets.ARS.MenuOptions.PreparedSpells",
            ),
            icon: "fas fa-book-reader",
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
        return this.#getEquippedWeapons(actor);
      case "abilityChecks":
        return this.#getAbilityScoreChecks(actor);
      case "savingThrows":
        return this.#getSavingThrows(actor);
      case "skills":
        return this.#getSkills(actor);
      case "preparedSpells":
        return this.#getSpells(actor);
      default:
        return { title: menuData.label, items: [] };
    }
  }

  #getAbilityScoreChecks(actor) {
    let abilityKeys = Object.keys(actor.system.abilities);
    if (!game.settings.get("ars", "useComeliness"))
      abilityKeys = abilityKeys.filter((k) => k !== "com");
    return {
      title: "Ability Scores",
      theme: "red",
      items: abilityKeys.map((i) => ({
        id: `${CATEGORY_KEYS.ABILITY_SCORES}.${i}`,
        name: game.i18n.localize(`ARS.abilityTypes.${i}`),
        cost: `<span class="ib-font-hero">${actor.system.abilities[i].value}</span>`,
        favoritable: false,
      })),
    };
  }
  #getSavingThrows(actor) {
    const saveKeys = Object.keys(actor.system.saves);
    return {
      title: "Saving Throws",
      theme: "red",
      items: saveKeys.map((i) => ({
        id: `${CATEGORY_KEYS.SAVING_THROWS}.${i}`,
        name: game.i18n.localize(`ARS.saveTypes.${i}`),
        cost: `<span class="ib-font-hero">${actor.system.saves[i].value}</span>`,
        favoritable: false,
      })),
    };
  }

  #hasEquippedWeapons(actor) {
    return !!actor.items.find(
      (i) => i.type === "weapon" && i.system.location.state === "equipped",
    );
  }

  /**
   * TODO: Exhaust Items with ammo costs
   * TODO: Exhaust Actions with per-whatever-time-unit uses
   */
  #getEquippedWeapons(actor) {
    const items = {};
    const primaryLabels = [];

    actor.equipped.forEach((i) => {
      if (i.type !== "weapon") return;
      if (i.system.location.state !== "equipped") return;

      primaryLabels.push(i.name);
      if (!items[i.name]) items[i.name] = { Items: [], Actions: [] };

      items[i.name]["Items"].push({
        id: i.id,
        name: i.name,
        img: i.img,
        description: i.system.description || "",
        // cost,
        // isExhausted,
      });

      const canSeeActions = game.user.isGM || i.system.attributes.identified;

      if (i.system.actionGroups.length && canSeeActions) {
        i.system.actionGroups.forEach((a) => {
          items[i.name]["Actions"].push({
            id: `${i.id}.actions.${a.id}`,
            name: a.name,
            img: a.img || i.img,
            description: a.description || "",
            favoritable: false,
            // cost,
            // isExhausted,
          });
        });
      }
    });

    return {
      title: "Attacks",
      theme: "red",
      hasTabs: true,
      tabLabels: [...new Set(primaryLabels)],
      items,
      hasSubTabs: true,
    };
  }

  /**
   * @todo Skill exhaustion with item.system.charges ?
   */
  #getSkills(actor) {
    const items = actor.skills.map((i) => ({
      id: i.id,
      name: i.name,
      img: i.img,
      description: i.system.description || "",
    }));

    return {
      title: "Skills",
      theme: "red",
      items,
    };
  }

  #getSpells(actor) {
    const hasMultipleMemorizationTypes =
      Object.keys(actor.system.memorizations).length > 1;

    let items = {};
    let tabLabels = Object.keys(actor.system.memorizations).reduce(
      (prev, curr) => ({ ...prev, [curr]: curr }),
      {},
    );

    Object.entries(actor.system.memorizations).forEach(
      ([key, { memslots }]) => {
        let targetItemList = items;

        items[key] = {};
        targetItemList = items[key];

        Object.entries(memslots).forEach(([spellLevel, slots]) => {
          targetItemList[spellLevel] = [];

          Object.values(slots).forEach((spell) => {
            if (!spell.spellItem) return;
            targetItemList[spellLevel].push({
              id: spell.id,
              name: spell.name,
              img: spell.img,
              description: spell.spellItem?.system?.description || "",
            });
          });

          if (!targetItemList[spellLevel].length)
            delete targetItemList[spellLevel];
        });
      },
    );

    return {
      title: "Spells",
      theme: "red",
      hasTabs: hasMultipleMemorizationTypes,
      tabLabels,
      hasSubTabs: true,
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
    const [itemId, isAction, actionId] = id.split(".");
    const source = actor.items.get(itemId);

    // --- ... oh, wait, it's an action on an item. ----------------------------
    if (!!isAction) return this.#rollAction(actor, source, actionId);

    // --- It's a weapon; attack with it. --------------------------------------
    if (source.type === "weapon")
      return actor._makeAttackWithItem(null, source);

    // --- It's a spell; set up the metadata for it. ---------------------------
    if (source.type === "spell") {
      console.info("It's a spell");
      return null;
    }

    // --- Some other sort of item. --------------------------------------------
    await source._chatRoll({
      item: source,
      sourceActor: actor,
      sourceToken: actor.token,
    });
  }

  #rollAbilityScore(actor, id) {
    return new game.ars.ARSDice(actor).makeAbilityCheckRoll(
      id.split(".")[1],
      "1d20",
    );
  }
  #rollSave(actor, id) {
    return new game.ars.ARSDice(actor).makeSaveRoll(false, id.split(".")[1]);
  }
  #rollAction(actor, item, actionId) {
    return actor._chatRoll(
      {
        type: "action",
        item,
        actionGroup: source.system.actionGroups.find((g) => {
          return !!g.actions.filter((a) => a.id === actionId);
        }),
      },
      item,
    );
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
        path: "system.attributes.hp",
        label: "HP",
        icon: "fa fa-heart",
        color: "#e5292c",
        style: "bar",
        compactVisible: true,
        hitFeedback: true,
      },
      {
        path: "carriedweight",
        maxPath: "maxWeight",
        label: "Wt",
        icon: "fa fa-weight-hanging",
        thresholdColor: true,
        resourceThresholdStages: [
          { label: "Light", threshold: 50, color: "#22c55e" },
          { label: "Encumbered", threshold: 75, color: "#eab308" },
          { label: "Overloaded", threshold: 100, color: "#ef4444" },
        ],
        style: "bar",
        compactVisible: true,
        hitFeedback: false,
      },
      {
        path: "system.attributes.ac",
        icon: "fa fa-shield-alt",
        label: "AC",
        style: "number",
        hitFeedback: false,
      },
      {
        path: "system.attributes.movement.current",
        icon: "fa fa-feather",
        label: "Move",
        style: "number",
        hitFeedback: false,
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
