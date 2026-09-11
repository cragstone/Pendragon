import { PENCheck, RollType, CardType, RollResult } from "../apps/checks.mjs";
import { FeastGlory } from "../apps/feast-glory.mjs";

export class PendragonCombat extends Combat {
  // suggested rounds, geniality threshold and bonus glory by feast size
  // (GMH Tables 3.2 and 3.7)
  static FEAST_SIZES = {
    small: { rounds: 2, threshold: 5, bonus: 10 },
    medium: { rounds: 3, threshold: 7, bonus: 25 },
    large: { rounds: 4, threshold: 9, bonus: 50 },
    royal: { rounds: 5, threshold: 11, bonus: 100 },
  };

  // for now we use 'skirmish' for standard Combat
  // and 'feast' for feast rules
  isFeast() {
    return this.getFlag("Pendragon", "encounterType") == "feast";
  }

  switchEncounterType() {
    if (this.isFeast()) {
      this.setFlag("Pendragon", "encounterType", "skirmish");
    } else {
      this.setFlag("Pendragon", "encounterType", "feast");
      if (!this.getFlag("Pendragon", "feastSize")) {
        this.setFlag("Pendragon", "feastSize", "medium");
      }
    }
    ui.combat.viewed = this;
  }

  getFeastSize() {
    return this.getFlag("Pendragon", "feastSize") ?? "medium";
  }

  getFeastSizeData() {
    return PendragonCombat.FEAST_SIZES[this.getFeastSize()] ?? PendragonCombat.FEAST_SIZES.medium;
  }

  switchFeastSize() {
    const sizes = Object.keys(PendragonCombat.FEAST_SIZES);
    const next = sizes[(sizes.indexOf(this.getFeastSize()) + 1) % sizes.length];
    this.setFlag("Pendragon", "feastSize", next);
    ui.combat.viewed = this;
  }

  async rollInitiative(ids, { formula = null, updateTurn = true, messageOptions = {} } = {}) {
    // special rules for a feast
    if (this.isFeast()) {
      await this.rollFeastInitiative(ids, {
        formula,
        updateTurn,
        messageOptions,
      });
      return this;
    }
    await super.rollInitiative(ids, { formula, updateTurn, messageOptions });
    return this;
  }

  async rollFeastInitiative(ids, { formula = null, updateTurn = true, messageOptions = {} } = {}) {
    // Structure input data
    ids = typeof ids === "string" ? [ids] : ids;
    //const currentId = this.combatant?.id;
    const updates = [];
    const messages = [];
    for (let [i, id] of ids.entries()) {
      // Get Combatant data (non-strictly)
      const combatant = this.combatants.get(id);
      if (!combatant?.isOwner) continue;
      // unopposed glory roll
      const rolldata = await PENCheck.makeDirectRoll(combatant.actor, RollType.GLORY, CardType.UNOPPOSED);
      let level = rolldata.resultLevel;
      // Fumble = reroll but reduce level by 1
      if (level == RollResult.FUMBLE) {
        rolldata.firstRoll = rolldata.rollVal;
        rolldata.firstResultLabel = game.i18n.localize("PEN.resultLevel." + level);
        rolldata.firstRollResult = rolldata.rollResult;
        const reroll = await PENCheck.makeDirectRoll(combatant.actor, RollType.GLORY, CardType.UNOPPOSED);
        rolldata.rollVal = reroll.rollVal;
        rolldata.rollResult = reroll.rollResult;
        level = reroll.resultLevel;
        if (level > RollResult.FUMBLE) {
          level -= 1;
        }
      }
      // Above = crit
      // Closer = success
      // Further = fail
      // using glory as the tiebreaker
      const fractionalGlory = combatant.actor.system.glory / 100_000;
      updates.push({
        _id: id,
        initiative: level + fractionalGlory,
      });

      // Construct chat message data
      const messageData = foundry.utils.mergeObject(
        {
          speaker: ChatMessage.getSpeaker({
            actor: combatant.actor,
            token: combatant.token,
            alias: combatant.name,
          }),
          flavor: game.i18n.format("COMBAT.RollsInitiative", { name: combatant.name }),
          flags: { "core.initiativeRoll": true },
        },
        messageOptions,
      );
      // ensure we use the adjusted result level
      rolldata.resultLabel = game.i18n.localize("PEN.resultLevel." + level);
      rolldata.resultLevel = level;
      rolldata.seatingLabel = game.i18n.localize("PEN.feast.resultLevel." + level);
      // Prepare chat data
      const chatData = foundry.utils.mergeObject(
        {
          author: game.user.id,
          content: await foundry.applications.handlebars.renderTemplate(
            "systems/Pendragon/templates/chat/feast-seating.hbs",
            { chatCard: [rolldata] },
          ),
          // Play 1 sound for the whole rolled set
          sound: i == 0 ? CONFIG.sounds.dice : null,
        },
        messageData,
      );

      messages.push(chatData);
    }
    if (!updates.length) return this;

    // Update multiple combatants
    await this.updateEmbeddedDocuments("Combatant", updates);
    // publish the roll results
    await ChatMessage.implementation.create(messages);
    return this;
  }

  async startCombat() {
    // set combatants to initial geniality
    this.combatants.forEach((c) => c.initGeniality());
    // update on next round / previous round
    super.startCombat();
  }

  nextRound() {
    if (this.isFeast()) {
      this.combatants.forEach((c) => c.addGeniality(Math.floor(c.initiative) - 1));
    }
    // TODO: for combat
    //   advance phases each round
    //     declare
    //     resolve
    //     apply outcomes
    //     movement
    //   remove participants that are captured
    //   if a battle encounter, remove participants based on posture
    super.nextRound();
  }

  async endCombat() {
    // GMH p. 44: award Feasting Glory before ending a feast
    if (this.isFeast()) {
      const awarded = await FeastGlory.showDialog(this);
      if (!awarded) {
        return this;
      }
    }
    return super.endCombat();
  }
}
