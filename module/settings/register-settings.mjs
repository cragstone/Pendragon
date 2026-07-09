import { PENCombatSettings } from "./settings-combatOptions.mjs";
import { PENXPSettings } from "./settings-xpOptions.mjs";
import { PENDiceSettings } from "./settings-diceOptions.mjs";

export function registerSettings() {
  let tokenDropModeOptions = {
    ask: game.i18n.localize("PEN.Settings.tokenDropModeAsk"),
    roll: game.i18n.localize("PEN.Settings.tokenDropModeRoll"),
    ignore: game.i18n.localize("PEN.Settings.tokenDropModeIgnore"),
  };

  //Game Settings

  game.settings.register("Pendragon", "gameYear", {
    name: "PEN.Settings.gameYear",
    hint: "PEN.Settings.gameYearHint",
    scope: "world",
    requiresReload: true,
    config: false,
    type: Number,
    default: 508,
  });

  //Combat Settings Button
  game.settings.registerMenu('Pendragon', 'combatOptions', {
    name: 'PEN.Settings.combatOptionsHint',
    label: 'PEN.Settings.combatOptions',
    icon: 'fas fa-swords',
    type: PENCombatSettings,
    restricted: true
  })
  PENCombatSettings.registerSettings()

  //XP Settings Button
  game.settings.registerMenu('Pendragon', 'xpOptions', {
    name: 'PEN.Settings.xpOptionsHint',
    label: 'PEN.Settings.xpOptions',
    icon: 'fas fa-certificate',
    type: PENXPSettings,
    restricted: true
  })
  PENXPSettings.registerSettings()

  //Dice Roll Settings Button
  game.settings.registerMenu('Pendragon', 'diceOptions', {
    name: 'PEN.Settings.diceOptionsHint',
    label: 'PEN.Settings.diceOptions',
    icon: 'fas fa-dice-d20',
    type: PENDiceSettings,
    restricted: true
  })
  PENDiceSettings.registerSettings()

  game.settings.register("Pendragon", "toolTipDelay", {
    name: "PEN.Settings.toolTipDelay",
    hint: "PEN.Settings.toolTipDelayHint",
    scope: "world",
    config: true,
    type: Number,
    default: 2000,
  });

  game.settings.register("Pendragon", "childMortality", {
    name: "PEN.Settings.childMortality",
    hint: "PEN.Settings.childMortalityHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register("Pendragon", "tokenVision", {
    name: "PEN.Settings.tokenVision",
    hint: "PEN.Settings.tokenVisionHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register("Pendragon", "useRelation", {
    name: "PEN.Settings.useRelation",
    hint: "PEN.Settings.useRelationHint",
    scope: "world",
    requiresReload: true,
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register("Pendragon", "showParty", {
    name: "PEN.Settings.showParty",
    hint: "PEN.Settings.showPartyHint",
    scope: "world",
    requiresReload: true,
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register("Pendragon", "tokenDropMode", {
    name: "PEN.Settings.tokenDropMode",
    hint: "PEN.Settings.tokenDropModeHint",
    scope: "world",
    requiresReload: true,
    config: true,
    default: "ask",
    choices: tokenDropModeOptions,
    type: String,
  });

  //Invisible Game Settings

  game.settings.register("Pendragon", "winter", {
    name: "",
    hint: "",
    scope: "world",
    requiresReload: false,
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register("Pendragon", "development", {
    name: "",
    hint: "",
    scope: "world",
    requiresReload: false,
    config: false,
    type: Boolean,
    default: false,
  });

  game.settings.register("Pendragon", "creation", {
    name: "",
    hint: "",
    scope: "world",
    requiresReload: false,
    config: false,
    type: Boolean,
    default: false,
  });

  // used by migration script
  game.settings.register("Pendragon", "systemMigrationVersion", {
    config: false,
    scope: "world",
    type: String,
    default: "",
  });
}
