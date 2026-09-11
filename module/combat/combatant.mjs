import { PENCheck } from "../apps/checks.mjs";

export class PendragonCombatant extends Combatant {
  // Geniality by Standard of Living (GMH Table 3.1)
  static SOL_GENIALITY = {
    impoverished: -5,
    poor: -3,
    ordinary: 1,
    rich: 2,
    superlative: 3,
    magnificent: 4,
    extravagant: 5,
    opulent: 6,
  };

  // we don't really have initiative,
  // but actions should be declared from lowest DEX to highest
  getInitiativeRoll(formula) {
    return new Roll(`${this.actor.system.stats.dex.total}`);
  }

  _onCreate(data, options, userID) {
    super._onCreate(data, options, userID);
    this.initGeniality();
  }

  initGeniality() {
    // from clothing; unknown SOL falls back to ordinary (+1)
    const sol = (this.actor?.system?.sol ?? "").toLowerCase();
    this.setFlag("Pendragon", "geniality", PendragonCombatant.SOL_GENIALITY[sol] ?? 1);
  }
  getGeniality() {
    return this.getFlag("Pendragon", "geniality") || 0;
  }
  addGeniality(val) {
    const curr = this.getFlag("Pendragon", "geniality") || 0;
    let next = curr + val;
    // geniality can't exceed APP (GMH p. 39)
    const app = this.actor?.system?.stats?.app?.total;
    if (Number.isInteger(app)) {
      next = Math.min(next, app);
    }
    this.setFlag("Pendragon", "geniality", next);
  }
  // geniality gained solely from feast events (GMH p. 44)
  getEventGeniality() {
    return this.getFlag("Pendragon", "eventGeniality") || 0;
  }
  addEventGeniality(val) {
    const curr = this.getEventGeniality();
    this.setFlag("Pendragon", "eventGeniality", curr + val);
  }
}
