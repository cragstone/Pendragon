import { PENCheck, RollResult } from "../apps/checks.mjs";
import { OPCard } from "./opposed-card.mjs";
import { PENactorDetails } from "../apps/actorDetails.mjs";
import { CombatAction, CombatOutcome } from "../apps/combat-actions.mjs";

export class COCard {
  //Resolve a combined card - roll dice, update and close
  static async COResolve(config) {
    let targetMsg = await game.messages.get(config.targetChatId);
    let chatCards = targetMsg.flags.Pendragon.chatCard;
    if (chatCards.length < 2) {
      ui.notifications.warn(game.i18n.localize("PEN.resolveMore"));
      return;
    }

    const result = this.compareCombatResults(chatCards[0], chatCards[1]);
    let newchatCards = [];
    for (let cCount = 0; cCount < 2; cCount++) {
      chatCards[cCount].outcome = result[cCount];
      chatCards[cCount].outcomeLabel = game.i18n.localize("PEN.comRoll" + result[cCount]);

      //If Critical, Tie or Win then allow Damage Roll
      if (["C", "T", "W"].includes(result[cCount])) {
        chatCards[cCount].damRoll = true;
      }

      //If Critical then set Damage Roll to critical
      if (["C"].includes(result[cCount])) {
        chatCards[cCount].damCrit = true;
      }

      //If made Dodge or Evade roll then don't cause damage
      if (["evade", "dodge"].includes(chatCards[cCount].action)) {
        chatCards[cCount].damRoll = false;
        chatCards[cCount].damCrit = false;
      }

      //Set Shield Use if Partial Success or better and opponent is causing damage
      if (["C", "T", "W", "P"].includes(result[cCount])) {
        if (["C", "T", "W"].includes(result[1 - cCount])) {
          chatCards[cCount].damShield = true;
        }
      }

      newchatCards.push(chatCards[cCount]);
      if (cCount === 0) {
        await OPCard.showDiceRoll(chatCards[cCount], false);
      } else {
        await OPCard.showDiceRoll(chatCards[cCount], true);
      }
      if (game.settings.get("Pendragon", "autoXP") && chatCards[cCount].resultLevel != 1) {
        await PENCheck.tickXP(chatCards[cCount]);
      }
    }

    await targetMsg.update({
      "flags.Pendragon.chatCard": newchatCards,
      "flags.Pendragon.state": "closed",
    });
    const pushhtml = await PENCheck.startChat(targetMsg.flags.Pendragon);
    await targetMsg.update({ content: pushhtml });
    return;
  }

  static async resolveCombatRolls(config) {
    const targetMsg = await game.messages.get(config.targetChatId);
    const chatCards = targetMsg.flags.Pendragon.chatCard;
    if (chatCards.length < 2) {
      ui.notifications.warn(game.i18n.localize("PEN.resolveMore"));
      return;
    }

    const [card1, card2] = chatCards;

    // adjust modifiers due to opponent and recalculate results if needed
    CombatAction.adjustOpposingModifiers(card1, card2);
    CombatAction.adjustOpposingModifiers(card2, card1);

    // compare the results to determine the outcome
    const [r1, r2] = this.compareCombatResults(card1, card2);

    //map outcomes
    const updatedCard1 = await this.mapOutcomeToCard(card1, r1, r2, card2.action, card2);
    const updatedCard2 = await this.mapOutcomeToCard(card2, r2, r1, card1.action, card1);

    // show results
    await OPCard.showDiceRoll(updatedCard1);
    if (game.settings.get("Pendragon", "autoXP") && updatedCard1.resultLevel != 1) {
      await PENCheck.tickXP(updatedCard1);
    }

    await OPCard.showDiceRoll(updatedCard2);
    if (game.settings.get("Pendragon", "autoXP") && updatedCard2.resultLevel != 1) {
      await PENCheck.tickXP(updatedCard2);
    }

    await targetMsg.update({
      "flags.Pendragon.chatCard": [updatedCard1, updatedCard2],
      "flags.Pendragon.state": "closed",
    });
    const pushhtml = await PENCheck.startChat(targetMsg.flags.Pendragon);
    await targetMsg.update({ content: pushhtml });
  }

  // update a card
  static async mapOutcomeToCard(card, myResult, otherResult, otherAction, otherCard = null) {
    const updatedCard = { ...card };
    // reckless and defend cancel each other out and are treated like opposed attack
    if (
      (card.action == CombatAction.RECKLESS && otherAction == CombatAction.DEFEND) ||
      (card.action == CombatAction.DEFEND && otherAction == CombatAction.RECKLESS)
    ) {
      updatedCard.action = CombatAction.ATTACK;
      otherAction = CombatAction.ATTACK;
    }
    updatedCard.outcome = myResult;
    updatedCard.outcomeLabel = game.i18n.localize(`PEN.comRoll${myResult}`);
    // assume no damage
    updatedCard.damRoll = false;
    updatedCard.damCrit = false;
    // assume no shield/parry
    updatedCard.damShield = false;

    if (this.canInflictDamage(updatedCard.action)) {
      // inflict damage on a win or tie
      if ([CombatOutcome.WIN, CombatOutcome.TIE].includes(myResult)) {
        updatedCard.damRoll = true;
      }

      // inflict critical damage on a critical
      if (myResult == CombatOutcome.CRITICAL) {
        updatedCard.damRoll = true;
        updatedCard.damCrit = true;
      }

      // defend ignores damage on win or tie
      if (
        otherAction == CombatAction.DEFEND &&
        [CombatOutcome.TIE, CombatOutcome.WIN, CombatOutcome.CRITICAL].includes(otherResult)
      ) {
        updatedCard.damRoll = false;
        updatedCard.damCrit = false;
        updatedCard.outcomeNote = "Opponent does not take damage.";
      }

      // mount ignores damage on win
      if (otherAction == CombatAction.MOUNT && [CombatOutcome.WIN, CombatOutcome.CRITICAL].includes(otherResult)) {
        updatedCard.damRoll = false;
        updatedCard.damCrit = false;
      }
    }

    // disarm: the winner knocks away the opponent's weapon or object
    if (card.action == CombatAction.DISARM) {
      if (myResult == CombatOutcome.CRITICAL) {
        updatedCard.outcomeNote = game.i18n.localize("PEN.actionNote.disarmCritical");
      } else if (myResult == CombatOutcome.WIN) {
        updatedCard.outcomeNote = game.i18n.localize("PEN.actionNote.disarmWin");
      }
    }

    // being disarmed by the opponent
    if (otherAction == CombatAction.DISARM && [CombatOutcome.WIN, CombatOutcome.CRITICAL].includes(otherResult)) {
      updatedCard.outcomeNote =
        otherResult == CombatOutcome.CRITICAL
          ? game.i18n.localize("PEN.actionNote.disarmedCritical")
          : game.i18n.localize("PEN.actionNote.disarmed");
    }

    // evade: on a win the character disengages, having dealt and taken no damage
    if (card.action == CombatAction.EVADE) {
      if ([CombatOutcome.WIN, CombatOutcome.CRITICAL].includes(myResult)) {
        updatedCard.outcomeNote = game.i18n.localize("PEN.actionNote.evadeWin");
      } else if (myResult == CombatOutcome.FUMBLE) {
        updatedCard.outcomeNote = game.i18n.localize("PEN.actionNote.evadeFumble");
      }
    }

    // the opponent evaded: they disengage and no damage is dealt either way
    if (otherAction == CombatAction.EVADE && [CombatOutcome.WIN, CombatOutcome.CRITICAL].includes(otherResult)) {
      updatedCard.damRoll = false;
      updatedCard.damCrit = false;
      updatedCard.outcomeNote = game.i18n.localize("PEN.actionNote.opponentEvaded");
    }

    // dodge: a successful dodge negates all melee damage dealt and taken
    if (card.action == CombatAction.DODGE) {
      if ([CombatOutcome.WIN, CombatOutcome.CRITICAL, CombatOutcome.TIE].includes(myResult)) {
        updatedCard.outcomeNote = game.i18n.localize("PEN.actionNote.dodgeWin");
      }
    }

    // the opponent dodged: the attack misses
    if (
      otherAction == CombatAction.DODGE &&
      [CombatOutcome.WIN, CombatOutcome.CRITICAL, CombatOutcome.TIE].includes(otherResult)
    ) {
      updatedCard.damRoll = false;
      updatedCard.damCrit = false;
      updatedCard.outcomeNote = game.i18n.localize("PEN.actionNote.opponentDodged");
    }

    // set spear: counters a charge using the opponent's own damage
    if (card.action == CombatAction.SET_SPEAR) {
      if (otherAction == CombatAction.CHARGE) {
        if ([CombatOutcome.WIN, CombatOutcome.CRITICAL].includes(myResult)) {
          updatedCard.damRoll = true;
          if (myResult == CombatOutcome.CRITICAL) {
            updatedCard.damCrit = true;
          }
          updatedCard.itemDamage = await this.setSpearDamage(card, otherCard);
          updatedCard.outcomeNote = game.i18n.localize("PEN.actionNote.setSpearHit");
        }
      } else {
        // against anything but a charge this counts as a simple attack
        updatedCard.action = CombatAction.ATTACK;
      }
    }

    // check for shield/parry vs a damaging action
    if (
      this.canInflictDamage(otherAction) &&
      [CombatOutcome.WIN, CombatOutcome.TIE, CombatOutcome.CRITICAL].includes(otherResult)
    ) {
      // by default you get benefit of shield/parry on a partial or better
      if ([CombatOutcome.WIN, CombatOutcome.TIE, CombatOutcome.CRITICAL, CombatOutcome.PARTIAL].includes(myResult)) {
        updatedCard.damShield = true;
      }

      // denied if either party used a reckless attack
      if (updatedCard.action == CombatAction.RECKLESS || otherAction == CombatAction.RECKLESS) {
        updatedCard.damShield = false;
        updatedCard.outcomeNote = "Reckless attacks prevent the use of shields.";
      }

      // denied if mounting up
      if (updatedCard.action == CombatAction.MOUNT) {
        updatedCard.damShield = false;
        updatedCard.outcomeNote = "You may not use a shield when mounting.";
      }
    }

    //  can we adjust the damage formulas here?

    // check for weapon breakage
    //  will weapon break / be dropped?
    // if TIE, swords break most weapons; swords and daggers immune
    // if CRITICAL vs FUMBLE, loser's weapon breaks (even if sword)
    // otherwise, FUMBLE means sword dropped or weapon breaks

    return updatedCard;
  }

  // set spear strikes the charger using the opponent's (or the mount's) damage
  // TODO: a two-handed grip adds +2D6 to this damage, but the system does not
  // track which hand weapons are wielded in; players can add +2D6 manually via
  // the damage roll dialog modifier until that state exists
  static async setSpearDamage(card, otherCard) {
    let damageFormula = otherCard?.itemDamage ?? "";
    if (!damageFormula) {
      // fall back to the opponent's weapon damage formula
      const opponent = await PENactorDetails._getParticipant(otherCard?.particId, otherCard?.particType);
      const weapon = opponent?.items?.get(otherCard?.itemId);
      if (weapon) {
        damageFormula = opponent.type === "character" ? weapon.system.damage : weapon.system.dmgForm;
      }
    }
    return damageFormula || null;
  }

  // check whether the action inflicts damage
  static canInflictDamage(action) {
    // opposed actions that don't roll damage on win:
    // defend, disarm, dodge, evade, hook, mount, pickup
    const nonDamagingActions = [
      CombatAction.DEFEND,
      CombatAction.DISARM,
      CombatAction.DODGE,
      CombatAction.EVADE,
      CombatAction.HOOK,
      CombatAction.MOUNT,
      CombatAction.PICKUP,
    ];
    if (nonDamagingActions.includes(action)) return false;
    return true;
  }

  static compareCombatResults(p1, p2) {
    // work around fact JS can't use tuple for case statement
    const k = (result1, result2) => `${result1}_${result2}`;
    switch (k(p1.resultLevel, p2.resultLevel)) {
      case k(RollResult.CRITICAL, RollResult.CRITICAL):
        return [CombatOutcome.TIE, CombatOutcome.TIE];
      case k(RollResult.CRITICAL, RollResult.SUCCESS):
        return [CombatOutcome.CRITICAL, CombatOutcome.PARTIAL];
      case k(RollResult.CRITICAL, RollResult.FAIL):
        return [CombatOutcome.CRITICAL, CombatOutcome.LOSE];
      case k(RollResult.CRITICAL, RollResult.FUMBLE):
        return [CombatOutcome.CRITICAL, CombatOutcome.FUMBLE];
      case k(RollResult.SUCCESS, RollResult.CRITICAL):
        return [CombatOutcome.PARTIAL, CombatOutcome.CRITICAL];
      // if both succeed, compare the rolls
      case k(RollResult.SUCCESS, RollResult.SUCCESS):
        if (p1.rollVal === p2.rollVal) {
          return [CombatOutcome.TIE, CombatOutcome.TIE];
        } else if (p1.rollVal > p2.rollVal) {
          return [CombatOutcome.WIN, CombatOutcome.PARTIAL];
        } else {
          return [CombatOutcome.PARTIAL, CombatOutcome.WIN];
        }
      case k(RollResult.SUCCESS, RollResult.FAIL):
        return [CombatOutcome.WIN, CombatOutcome.LOSE];
      case k(RollResult.SUCCESS, RollResult.FUMBLE):
        return [CombatOutcome.FUMBLE, CombatOutcome.FUMBLE];

      case k(RollResult.FAIL, RollResult.CRITICAL):
        return [CombatOutcome.LOSE, CombatOutcome.CRITICAL];
      case k(RollResult.FAIL, RollResult.SUCCESS):
        return [CombatOutcome.LOSE, CombatOutcome.WIN];
      case k(RollResult.FAIL, RollResult.FAIL):
        return [CombatOutcome.LOSE, CombatOutcome.LOSE];
      case k(RollResult.FAIL, RollResult.FUMBLE):
        return [CombatOutcome.LOSE, CombatOutcome.FUMBLE];

      case k(RollResult.FUMBLE, RollResult.CRITICAL):
        return [CombatOutcome.FUMBLE, CombatOutcome.CRITICAL];
      case k(RollResult.FUMBLE, RollResult.SUCCESS):
        return [CombatOutcome.FUMBLE, CombatOutcome.WIN];
      case k(RollResult.FUMBLE, RollResult.FAIL):
        return [CombatOutcome.FUMBLE, CombatOutcome.LOSE];
      case k(RollResult.FUMBLE, RollResult.FUMBLE):
        return [CombatOutcome.FUMBLE, CombatOutcome.FUMBLE];
    }
  }

  //Generate Damage Roll off the Combat Roll Damage Button
  static async combatDamageRoll(config) {
    let targetMsg = await game.messages.get(config.targetChatId);
    let rank = config.dataset.rank;

    //Turn off the DamageRoll button for the clicked button and update the existing chat message so the button disappears to prevent multiple rerolls
    const chatCards = targetMsg.flags.Pendragon.chatCard;
    chatCards[rank].damRoll = false;
    const newChatCards = [];
    for (let cCard of chatCards) {
      newChatCards.push(cCard);
    }
    await targetMsg.update({
      "flags.Pendragon.chatCard": newChatCards,
    });
    const pushhtml = await PENCheck.startChat(targetMsg.flags.Pendragon);
    await targetMsg.update({ content: pushhtml });

    //Prep the damage roll with details from combat roll
    let actor = null;
    let token = null;
    if (targetMsg.flags.Pendragon.chatCard[rank].particType === "actor") {
      actor = await PENactorDetails._getParticipant(
        targetMsg.flags.Pendragon.chatCard[rank].particId,
        targetMsg.flags.Pendragon.chatCard[rank].particType,
      );
    } else if (targetMsg.flags.Pendragon.chatCard[rank].particType === "token") {
      token = await PENactorDetails._getParticipant(
        targetMsg.flags.Pendragon.chatCard[rank].particId,
        targetMsg.flags.Pendragon.chatCard[rank].particType,
      );
    } else {
      return;
    }

    await PENCheck._trigger({
      rollType: "DM",
      cardType: "NO",
      shiftKey: true,
      damCrit: chatCards[rank].damCrit,
      itemId: chatCards[rank].itemId,
      damMod: chatCards[rank].damMod,
      // if set (v2 actions) can simply use already-calculated value
      itemDamage: chatCards[rank].itemDamage,
      action: chatCards[rank].action,
      actor: actor,
      token: token,
    });
    return;
  }
}
