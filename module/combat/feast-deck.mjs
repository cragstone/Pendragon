import PENDialog from "../setup/pen-dialog.mjs";
import { PENactorDetails } from "../apps/actorDetails.mjs";

const DECK_MODULE = "cha-pen-fvtt-en-gmhandbook";
const DECK_PACK = "cha-pen-fvtt-en-gmhandbook.gmhb-feastdeck";

export class FeastDeck {
  static HOST_PREFIX = "Host ";

  static isAvailable() {
    return !!(game.modules.get(DECK_MODULE)?.active && game.packs.get(DECK_PACK));
  }

  // Glory prominence modifier (GMH Table 3.4)
  static getProminence(glory) {
    if (glory >= 32000) return 8;
    if (glory >= 16000) return 7;
    if (glory >= 12000) return 6;
    if (glory >= 8000) return 5;
    if (glory >= 6000) return 4;
    if (glory >= 4000) return 3;
    if (glory >= 3000) return 2;
    if (glory >= 1000) return 1;
    return 0;
  }

  // Feast Event cards per Round by Total APP (GMH Table 3.5)
  static getDrawLimit(totalAPP) {
    return Math.max(0, Math.min(6, Math.floor((totalAPP - 5) / 5) + 1));
  }

  // Total APP for the Round: APP + Geniality + Prominence
  static getTotalAPP(combatant) {
    const actor = combatant.actor;
    const prominence = this.getProminence(actor?.system?.glory ?? 0);
    return (actor?.system?.stats?.app?.total ?? 0) + combatant.getGeniality() + prominence;
  }

  static getDrawState(combat, combatantId) {
    return (combat.getFlag("Pendragon", "feastDraws") ?? {})[combatantId] ?? null;
  }

  static async setDrawState(combat, combatantId, state) {
    const all = foundry.utils.duplicate(combat.getFlag("Pendragon", "feastDraws") ?? {});
    all[combatantId] = state;
    await combat.setFlag("Pendragon", "feastDraws", all);
  }

  static async postCardMessage(combat, combatant, state) {
    const partic = await PENactorDetails._getParticipantId(combatant.token, combatant.actor);
    const content = await foundry.applications.handlebars.renderTemplate(
      "systems/Pendragon/templates/chat/feast-card.hbs",
      {
        card: state,
        name: combatant.name,
        particId: partic?.particId,
        particType: partic?.particType,
        canRedraw: !state.host && state.drawn < state.limit,
        data: { combatId: combat.id, combatantId: combatant.id, cardId: state.cardId },
      },
    );
    await ChatMessage.implementation.create({
      author: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: combatant.actor, token: combatant.token, alias: combatant.name }),
      flavor: game.i18n.format("PEN.feast.cardFlavor", { name: combatant.name, round: state.round }),
      content,
      flags: { Pendragon: { feastCard: true } },
    });
  }

  // the card's Geniality modifier (printed on the art) is entered at play time
  static async promptGeniality() {
    const html = await foundry.applications.handlebars.renderTemplate(
      "systems/Pendragon/templates/dialog/feast-geniality.hbs",
      {},
    );
    const result = await PENDialog.input({
      window: {
        title: game.i18n.localize("PEN.feast.genialityPrompt"),
      },
      position: {
        width: 300,
      },
      content: html,
    });
    return result ? Number(result.geniality) || 0 : null;
  }

  static async triggerTrackerAction(dataset) {
    if (game.user.isGM) {
      return this.handleDraw(dataset);
    }
    const availableGM = game.users.find((d) => d.active && d.isGM)?.id;
    if (!availableGM) {
      ui.notifications.warn(game.i18n.localize("PEN.noAvailableGM"));
      return;
    }
    game.socket.emit("system.Pendragon", {
      type: "chatUpdate",
      to: availableGM,
      value: { presetType: "feastDraw", targetChatId: "", originGM: false, event: null, dataset },
    });
  }

  static async handleDraw(dataset) {
    const combat = game.combats.get(dataset.combatId);
    const combatant = combat?.combatants.get(dataset.combatantId);
    if (!combat || !combatant) {
      return;
    }
    if (!this.isAvailable()) {
      ui.notifications.warn(game.i18n.localize("PEN.feast.deckMissing"));
      return;
    }
    let state = this.getDrawState(combat, combatant.id);
    if (state && state.round !== combat.round) {
      state = null;
    }
    const limit = this.getDrawLimit(this.getTotalAPP(combatant));
    if (limit <= 0) {
      ui.notifications.warn(game.i18n.format("PEN.feast.noCards", { name: combatant.name }));
      return;
    }
    if (state?.cardId) {
      ui.notifications.warn(game.i18n.localize("PEN.feast.cardPending"));
      return;
    }
    const drawn = state?.drawn ?? 0;
    if (drawn >= limit) {
      ui.notifications.warn(game.i18n.format("PEN.feast.drawLimitReached", { drawn, limit }));
      return;
    }
    const cards = await this.getDeckCards();
    const playedIds = combat.getFlag("Pendragon", "feastDeckPlayed") ?? [];
    let pool = cards.filter((c) => !playedIds.includes(c.id));
    if (!pool.length) {
      // deck exhausted: played cards return to the deck (GMH p. 42)
      pool = cards;
      await combat.unsetFlag("Pendragon", "feastDeckPlayed");
    }
    const card = pool[Math.floor(Math.random() * pool.length)];
    const host = card.name?.startsWith(this.HOST_PREFIX);
    const newState = {
      round: combat.round,
      drawn: drawn + 1,
      limit,
      cardId: card.id,
      cardName: card.name,
      cardImg: card.faces?.[0]?.img ?? card.img,
      host,
    };
    await this.setDrawState(combat, combatant.id, newState);
    await this.postCardMessage(combat, combatant, newState);
  }

  // new Round means fresh card drawing (GMH pp. 41-42)
  static resetRound(combat) {
    combat.unsetFlag("Pendragon", "feastDraws");
  }

  // played cards are set aside until the deck is exhausted
  static async markPlayed(combat, cardId) {
    const played = foundry.utils.duplicate(combat.getFlag("Pendragon", "feastDeckPlayed") ?? []);
    if (!played.includes(cardId)) {
      played.push(cardId);
    }
    await combat.setFlag("Pendragon", "feastDeckPlayed", played);
  }

  static async getDeckCards() {
    const pack = game.packs.get(DECK_PACK);
    if (!pack) {
      return [];
    }
    const stacks = await pack.getDocuments();
    const deck = stacks.find((s) => s.name === "Feast Deck") ?? stacks[0];
    return deck ? Array.from(deck.cards) : [];
  }

  // chat card action on the clicker's client; may need input before applying
  static async triggerChatAction({ presetType, dataset, targetChatId }) {
    if (presetType === "feastPlay") {
      const geniality = await this.promptGeniality();
      if (geniality === null) {
        return;
      }
      dataset = { ...dataset, geniality };
    }
    if (game.user.isGM) {
      return this.applyChatAction({ presetType, dataset, targetChatId });
    }
    const availableGM = game.users.find((d) => d.active && d.isGM)?.id;
    if (!availableGM) {
      ui.notifications.warn(game.i18n.localize("PEN.noAvailableGM"));
      return;
    }
    game.socket.emit("system.Pendragon", {
      type: "chatUpdate",
      to: availableGM,
      value: { presetType, targetChatId, originGM: false, event: null, dataset },
    });
  }

  // GM-side chat card action; players arrive here via socket
  static async applyChatAction({ presetType, dataset, targetChatId }) {
    const combat = game.combats.get(dataset.combatId);
    const combatant = combat?.combatants.get(dataset.combatantId);
    if (!combat || !combatant) {
      return;
    }
    if (presetType === "feastDraw") {
      return this.handleDraw(dataset);
    }
    if (presetType === "feastPlay") {
      const gained = Number(dataset.geniality) || 0;
      combatant.addGeniality(gained);
      combatant.addEventGeniality(gained);
      await this.markPlayed(combat, dataset.cardId);
      const state = this.getDrawState(combat, combatant.id);
      // Host cards end drawing for the Round once played
      if (state?.host) {
        await this.clearDrawState(combat, combatant.id);
      }
      const message = targetChatId ? game.messages.get(targetChatId) : null;
      if (message) {
        await message.update({ content: await this.renderPlayedMessage(combat, combatant, state, gained) });
      }
    }
  }

  static async renderPlayedMessage(combat, combatant, state, gained) {
    return foundry.applications.handlebars.renderTemplate("systems/Pendragon/templates/chat/feast-card.hbs", {
      played: true,
      name: combatant.name,
      particId: combatant.actor?.id,
      particType: "actor",
      card: state,
      gained,
      canRedraw: !state?.host && (state?.drawn ?? 0) < (state?.limit ?? 0),
      data: { combatId: combat.id, combatantId: combatant.id },
    });
  }
}