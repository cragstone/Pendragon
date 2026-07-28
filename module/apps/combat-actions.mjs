import { OPCard } from "../cards/opposed-card.mjs";
import { ChatCardState, ChatCardTemplate } from "./chat.mjs";
import { CardType, RollType, PENCheck, RollResult } from "./checks.mjs";

const { api, fields } = foundry.applications;

export class CombatOutcome {
  static CRITICAL = "C";
  static WIN = "W";
  static TIE = "T";
  static PARTIAL = "P";
  static LOSE = "L";
  static FUMBLE = "F";
}

export class CombatAction {
  static ATTACK = "attack";
  static UNOPPOSED_ATTACK = "unoppAtt";
  static RECKLESS = "reckless";
  static SQUIRE = "callSquire";
  static DEFEND = "defend";
  static DISARM = "disarm";
  static EVADE = "evade";
  static PRISONER = "claimPrisoner";
  static PICKUP = "pickUp";
  static SACRIFICE = "selfSacrifice";
  static STUDY = "study";
  static WITHHOLD = "withholdDamage";
  static ZIGZAG = "zigzag";
  static CHARGE = "charge";
  static CONTROL_MOUNT = "controlMount";
  static TRAMPLE = "trample";
  static DISMOUNT = "dismount";
  static QUICK_DISMOUNT = "quickDismount";
  static DODGE = "dodge";
  static ARMOR = "donArmor";
  static HOOK = "hook";
  static SET_SPEAR = "setSpear";
  static MOUNT = "mount";

  // check whether the action inflicts damage
  static canInflictDamage(action) {
    // opposed actions that don't roll damage on win:
    // defend, disarm, dodge, evade, hook, mount, pickup
    const nonDamagingActions = [
      CombatAction.DEFEND,
      CombatAction.DISARM,
      CombatAction.DISMOUNT,
      CombatAction.DODGE,
      CombatAction.EVADE,
      CombatAction.HOOK,
      CombatAction.MOUNT,
      CombatAction.PICKUP,
    ];
    if (nonDamagingActions.includes(action)) return false;
    return true;
  }

  // apply Horsemanship cap to combat rolls if mounted
  static applyHorsemanshipCap(actor, skill) {
    const targetScore = skill.total;
    // apply horsemanship cap if mounted
    if (actor.isMounted()) {
      const horsemanship = actor.getSkillTotal("i.skill.horsemanship");
      return Math.min(targetScore, horsemanship);
    }
    return targetScore;
  }

  // calculate the initial roll modifiers
  // there can be further adjusted
  static getRollModifiers(action) {
    let total = 0;
    // +10 if taking defend action
    if (action == CombatAction.DEFEND) {
      total += 10;
    }
    //  magic bonus
    // THEN multiple target modifier
    //  number of targets (n -1) * -5
    // THEN combat modifiers
    //  cover?
    //  height advantage/penalty
    //  immobile advantage/penalty
    // THEN passion modifier
    // THEN other
    return total;
  }

  // this presents a dialog that lets you adjust the bonus
  // returns null if the roll is canceled
  static async requestRollModifiers(action) {
    const bonuses = this.getRollModifiers(action);
    const textInput = fields.createNumberInput({
      name: "checkBonus",
      value: bonuses,
    });
    const textGroup = fields.createFormGroup({
      input: textInput,
      label: game.i18n.localize("PEN.checkBonus"),
      hint: game.i18n.localize("PEN.checkBonusHint"),
    });
    const content = `${textGroup.outerHTML}`;
    const data = await api.DialogV2.input({
      window: { title: `PEN.actions.${action}` },
      content: content,
      ok: { label: "Roll" },
    });
    return data?.checkBonus;
  }

  static defaultOptions(actor, action) {
    return {
      actor,
      particName: actor.name,
      particId: actor.id,
      particImg: actor.img,
      particType: "actor",
      actorType: actor.type,
      rollType: RollType.COMBAT,
      cardType: CardType.COMBAT,
      rollFormula: "1D20",
      state: ChatCardState.OPEN,
      chatTemplate: ChatCardTemplate.COMBAT,
      chatType: CONST.CHAT_MESSAGE_STYLES.OTHER,
      action,
      flatMod: 0,
      reflexMod: 0,
    };
  }

  // make a fairly standard opposed combat roll using weapon skill
  // returns null if the roll dialog is canceled
  static async opposedWeaponRollOptions(actor, action) {
    // default to unarmed
    let currentWeapon = {
      id: null,
      name: "Unarmed",
      total: actor.getSkillTotal("i.skill.brawling"),
      damage: actor.system.damage,
    };
    // determine skill based on current weapon
    const weapon = actor.currentWeapon();
    if (weapon) {
      currentWeapon = {
        id: weapon.id,
        name: weapon.name,
        total: weapon.system.total,
        damage: weapon.system.damage,
      };
    }
    // mounted charge adjustments
    if (action == CombatAction.CHARGE) {
      // expected to be on combat trained horse
      const horseDamage = actor.currentHorse().system.chargeDmg;
      const chargeSkillTotal = actor.getSkillTotal("i.skill.charge");
      // use lower of charge or weapon skill
      currentWeapon.total = Math.min(chargeSkillTotal, weapon.system.total);
      // if dmgChar = "h" weapon damage already set properly
      // TODO: special case spear as lance
      if (weapon.system.damageChar != "h") {
        const weaponDamageDice = actor.system.damage + Number(weapon.system.damageMod) + 1;
        const dmgDice = Math.min(weaponDamageDice, Number.parseInt(horseDamage));
        const dmgModifier = Number(weapon.system.damageBonus) + Number(actor.system.damageMod);
        currentWeapon.damage = `${dmgDice}D6`;
        if (dmgModifier != 0) {
          currentWeapon.damage = `${dmgDice}D6 + ${dmgModifier}`;
        }
      }
    }
    const targetScore = this.applyHorsemanshipCap(actor, currentWeapon);
    // will use as flatMod but later make more granular
    const modifier = await this.requestRollModifiers(action);
    if (modifier == null) return null;
    // opposed roll by default
    const options = {
      ...this.defaultOptions(actor, action),
      ...this.calcTargets(targetScore, modifier),
      itemId: currentWeapon?.id,
      flatMod: modifier,
      label: currentWeapon.name,
      rawScore: currentWeapon.total,
      skillId: weapon?.system.sourceId ?? actor.getItemByPid("i.skill.brawling")?.id,
    };
    return options;
  }

  // modify the target score and crit bonus
  static calcTargets(targetScore, modifier) {
    const grossTarget = targetScore + modifier;
    const options = {
      grossTarget,
      targetScore: grossTarget,
      critBonus: 0,
    };
    if (grossTarget > 20) {
      options.critBonus = grossTarget - 20;
      options.targetScore = 20;
    } else if (grossTarget < 0) {
      options.critBonus = -grossTarget;
      options.targetScore = 0;
    }
    return options;
  }

  // adjust modifiers based on opponent
  // these should alway be applied after opposed roll is made
  // but before outcome is calculated
  static adjustOpposingModifiers(config, opponent) {
    const originalTarget = config.grossTarget - config.flatMod;
    //  reckless vs defend (treat as attack vs attack; cancel defend bonus)
    if (config.action == CombatAction.DEFEND && opponent.action == this.RECKLESS) {
      config.flatMod -= 10;
    }
    //  TODO: mounted vs foot or foot vs prone(height advantage)
    //  TODO: foot using reach weapon vs mounted (cancels height advantage)
    //  opponent using reckless +5
    if (config.action != CombatAction.DEFEND && opponent.action == this.RECKLESS) {
      config.flatMod += 5;
    }
    // TODO: charge using lance/spear, opponent not using reach weapon

    // recalculate the gross target
    const grossTarget = originalTarget + config.flatMod;
    // if this hasn't changed, we don't need to do anything
    if (grossTarget == config.grossTarget) {
      return;
    }
    // re-calculate target and crit bonus
    if (grossTarget > 20) {
      config.critBonus = grossTarget - 20;
      config.targetScore = 20;
    } else if (grossTarget < 0) {
      config.critBonus = -grossTarget;
      config.targetScore = 0;
    } else {
      config.targetScore = grossTarget;
      config.critBonus = 0;
    }
    config.grossTarget = grossTarget;

    // cap result at 20 per original check
    config.rollVal = Math.min(Number(config.rollResult + config.critBonus), 20);
    config.resultLevel = PENCheck.successLevel(config);
  }

  static applyUnopposedOutcome(options) {
    if (options.resultLevel === RollResult.CRITICAL) {
      options.damCrit = true;
    }

    if (options.resultLevel > RollResult.FAIL) {
      options.damRoll = true;
      options.outcome = CombatOutcome.WIN;
      options.outcomeLabel = game.i18n.localize("PEN.comRollW");
    } else {
      options.outcome = CombatAction.LOSE;
      options.outcomeLabel = game.i18n.localize("PEN.comRollL");
    }
  }

  // Standard Attack
  static async attack(actor, unopposed = false) {
    // standard opposed weapon roll
    const options = await this.opposedWeaponRollOptions(actor, CombatAction.ATTACK);
    if (options == null) return;

    // allow for unopposed roll
    if (unopposed) {
      options.action = CombatAction.UNOPPOSED_ATTACK;
      options.cardType = CardType.UNOPPOSED;
      options.state = ChatCardState.CLOSED;
    }

    // make the roll
    await PENCheck.makeRoll(options);

    // set the outcome if unopposed
    if (unopposed) {
      this.applyUnopposedOutcome(options);
    }

    await this.createChatCard(options);
  }

  // Reckless Attack
  static async reckless(actor, unopposed = false) {
    // standard opposed weapon roll
    const options = await this.opposedWeaponRollOptions(actor, CombatAction.RECKLESS);
    if (options == null) return;

    // allow for unopposed roll
    if (unopposed) {
      options.cardType = CardType.UNOPPOSED;
      options.state = ChatCardState.CLOSED;
    }

    // make the roll
    await PENCheck.makeRoll(options);

    // set the outcome if unopposed
    if (unopposed) {
      this.applyUnopposedOutcome(options);
    }

    await this.createChatCard(options);
  }

  // DEFEND
  static async defend(actor, unopposed = false) {
    // standard opposed weapon roll
    const options = await this.opposedWeaponRollOptions(actor, CombatAction.DEFEND);
    if (options == null) return;

    // allow for unopposed roll
    if (unopposed) {
      options.cardType = CardType.UNOPPOSED;
      options.state = ChatCardState.CLOSED;
    }

    // make the roll
    await PENCheck.makeRoll(options);

    // set the outcome if unopposed
    if (unopposed) {
      this.applyUnopposedOutcome(options);
    }

    await this.createChatCard(options);
  }

  static async mount(actor, unopposed = false) {
    const targetScore = this.applyHorsemanshipCap(actor, {
      total: actor.system.move,
    });
    // will use as flatMod but later make more granular
    const modifier = await this.requestRollModifiers(CombatAction.MOUNT);
    if (modifier == null) return;
    // opposed roll by default
    const options = {
      ...this.defaultOptions(actor, CombatAction.MOUNT),
      ...this.calcTargets(targetScore, modifier),
      flatMod: modifier,
      label: game.i18n.localize("PEN.move"),
      rawScore: actor.system.move,
    };
    // allow for unopposed roll
    if (unopposed) {
      options.cardType = CardType.UNOPPOSED;
      options.state = ChatCardState.CLOSED;
      // leap into saddle requires a roll
      // or mount carefully unopposed
      actor.mountCurrentHorse();
      await this.createDeclarationCard(options, `${options.particName} mounts their horse.`);
      return;
    }
    // make the roll
    await PENCheck.makeRoll(options);
    await this.createChatCard(options);
  }

  static async dismount(actor, unopposed = false) {
    if (!actor.isMounted()) {
      ui.notifications.warn(game.i18n.localize("PEN.warn.mustBeMounted"));
      return;
    }
    const targetScore = this.applyHorsemanshipCap(actor, {
      total: actor.system.move,
    });
    // will use as flatMod but later make more granular
    const modifier = await this.requestRollModifiers(CombatAction.DISMOUNT);
    if (modifier == null) return;
    // opposed roll by default
    const options = {
      ...this.defaultOptions(actor, CombatAction.DISMOUNT),
      ...this.calcTargets(targetScore, modifier),
      flatMod: modifier,
      label: game.i18n.localize("PEN.move"),
      rawScore: actor.system.move,
    };
    // allow for unopposed roll
    if (unopposed) {
      options.cardType = CardType.UNOPPOSED;
      options.state = ChatCardState.CLOSED;
      // leap out of saddle requires a roll
      // or mount carefully unopposed
      actor.dismountCurrentHorse();
      await this.createDeclarationCard(options, `${options.particName} dismounts their horse.`);
      return;
    }
    // make the roll
    await PENCheck.makeRoll(options);
    await this.createChatCard(options);
  }

  static async claimPrisoner(actor) {
    const options = {
      action: CombatAction.PRISONER,
      particName: actor.name,
      particImg: actor.img,
      actor: actor,
    };
    await this.createDeclarationCard(options, `${options.particName} claims a prisoner.`);
  }

  static async callSquire(actor) {
    const options = {
      action: CombatAction.SQUIRE,
      particName: actor.name,
      particImg: actor.img,
      actor: actor,
    };
    await this.createDeclarationCard(options, `${options.particName} NOT IMPLEMENTED`);
  }

  static async disarm(actor) {
    const options = {
      action: CombatAction.DISARM,
      particName: actor.name,
      particImg: actor.img,
      actor: actor,
    };
    await this.createDeclarationCard(options, `${options.particName} NOT IMPLEMENTED`);
  }

  static async evade(actor) {
    const options = {
      action: CombatAction.EVADE,
      particName: actor.name,
      particImg: actor.img,
      actor: actor,
    };
    await this.createDeclarationCard(options, `${options.particName} NOT IMPLEMENTED`);
  }

  static async pickUp(actor) {
    const options = {
      action: CombatAction.PICKUP,
      particName: actor.name,
      particImg: actor.img,
      actor: actor,
    };
    await this.createDeclarationCard(options, `${options.particName} NOT IMPLEMENTED`);
  }

  static async selfSacrifice(actor) {
    const options = {
      action: CombatAction.SACRIFICE,
      particName: actor.name,
      particImg: actor.img,
      actor: actor,
    };
    await this.createDeclarationCard(options, `${options.particName} NOT IMPLEMENTED`);
  }

  static async study(actor) {
    const options = {
      action: CombatAction.STUDY,
      particName: actor.name,
      particImg: actor.img,
      actor: actor,
    };
    await this.createDeclarationCard(options, `${options.particName} NOT IMPLEMENTED`);
  }

  static async withholdDamage(actor) {
    const options = {
      action: CombatAction.WITHHOLD,
      particName: actor.name,
      particImg: actor.img,
      actor: actor,
    };
    await this.createDeclarationCard(options, `${options.particName} NOT IMPLEMENTED`);
  }

  static async zigzag(actor) {
    const options = {
      action: CombatAction.ZIGZAG,
      particName: actor.name,
      particImg: actor.img,
      actor: actor,
    };
    await this.createDeclarationCard(options, `${options.particName} NOT IMPLEMENTED`);
  }

  static async charge(actor, unopposed = false) {
    if (!actor.isMounted()) {
      ui.notifications.warn(game.i18n.localize("PEN.warn.mustBeMounted"));
      return;
    }
    if (!actor.currentHorse().system.combat) {
      ui.notifications.warn(game.i18n.localize("PEN.warn.needCombatTrainedMount"));
      return;
    }
    if (!actor.currentWeapon()?.system.canCharge) {
      ui.notifications.warn(game.i18n.localize("PEN.warn.currentWeaponCannotCharge"));
      return;
    }
    // standard opposed weapon roll
    const options = await this.opposedWeaponRollOptions(actor, CombatAction.CHARGE);
    if (options == null) return;

    // allow for unopposed roll
    if (unopposed) {
      options.cardType = CardType.UNOPPOSED;
      options.state = ChatCardState.CLOSED;
    }

    // make the roll
    await PENCheck.makeRoll(options);

    // set the outcome if unopposed
    if (unopposed) {
      this.applyUnopposedOutcome(options);
    }

    await this.createChatCard(options);
  }

  static async controlMount(actor) {
    if (!actor.isMounted()) {
      ui.notifications.warn(game.i18n.localize("PEN.warn.mustBeMounted"));
      return;
    }
    const options = {
      action: CombatAction.CONTROL_MOUNT,
      particName: actor.name,
      particImg: actor.img,
      actor: actor,
    };
    await this.createDeclarationCard(options, `${options.particName} NOT IMPLEMENTED`);
  }

  static async trample(actor) {
    if (!actor.isMounted()) {
      ui.notifications.warn(game.i18n.localize("PEN.warn.mustBeMounted"));
      return;
    }
    const options = {
      action: CombatAction.TRAMPLE,
      particName: actor.name,
      particImg: actor.img,
      actor: actor,
    };
    await this.createDeclarationCard(options, `${options.particName} NOT IMPLEMENTED`);
  }

  static async quickDismount(actor) {
    if (!actor.isMounted()) {
      ui.notifications.warn(game.i18n.localize("PEN.warn.mustBeMounted"));
      return;
    }
    const options = {
      action: CombatAction.QUICK_DISMOUNT,
      particName: actor.name,
      particImg: actor.img,
      actor: actor,
    };
    await this.createDeclarationCard(options, `${options.particName} NOT IMPLEMENTED`);
  }

  static async dodge(actor) {
    const options = {
      action: CombatAction.DODGE,
      particName: actor.name,
      particImg: actor.img,
      actor: actor,
    };
    await this.createDeclarationCard(options, `${options.particName} NOT IMPLEMENTED`);
  }

  static async donArmor(actor) {
    const options = {
      action: CombatAction.ARMOR,
      particName: actor.name,
      particImg: actor.img,
      actor: actor,
    };
    await this.createDeclarationCard(options, `${options.particName} NOT IMPLEMENTED`);
  }

  static async hook(actor) {
    const options = {
      action: CombatAction.HOOK,
      particName: actor.name,
      particImg: actor.img,
      actor: actor,
    };
    await this.createDeclarationCard(options, `${options.particName} NOT IMPLEMENTED`);
  }

  static async setSpear(actor) {
    const options = {
      action: CombatAction.SET_SPEAR,
      particName: actor.name,
      particImg: actor.img,
      actor: actor,
    };
    await this.createDeclarationCard(options, `${options.particName} NOT IMPLEMENTED`);
  }

  // used to declare an unopposed action with an automatic success
  // examples: don armor, study, pick up, claim prisoner
  static async createDeclarationCard(config, message) {
    const messageData = {
      action: config.action,
      actionLabel: game.i18n.localize(`PEN.actions.${config.action}`),
      image: config.particImg,
      name: config.particName,
      message: message,
    };
    const html = await foundry.applications.handlebars.renderTemplate(ChatCardTemplate.DECLARE, messageData);
    const chatData = {
      user: game.user.id,
      content: html,
      speaker: {
        actor: config.actor._id,
        alias: config.actor.name,
      },
    };
    await ChatMessage.create(chatData);
  }

  static async createChatCard(config) {
    const chatMsgData = {
      rollType: config.rollType,
      cardType: config.cardType,
      chatType: config.chatType,
      chatTemplate: config.chatTemplate,
      state: config.state,
      rolls: config.roll,
      resultLevel: config.resultLevel,
      rollResult: config.rollResult,
      inquiry: config.inquiry,
      chatCard: [
        {
          rollType: config.rollType,
          particId: config.particId,
          particType: config.particType,
          particName: config.particName,
          particImg: config.particImg,
          actorType: config.actorType,
          characteristic: config.characteristic ?? false,
          label: config.label,
          oppLabel: config.oppLabel,
          oppRawScore: config.oppRawScore,
          decision: config.decision,
          reverseRoll: config.reverseRoll,
          reflex: config.reflex,
          skillId: config.skillId,
          itemId: config.itemId,
          targetScore: config.targetScore,
          grossTarget: config.grossTarget,
          rawScore: config.rawScore,
          rollFormula: config.rollFormula,
          flatMod: config.flatMod,
          reflexMod: config.reflexMod,
          critBonus: config.critBonus,
          rollResult: config.rollResult,
          rollVal: config.rollVal,
          roll: config.roll,
          resultLevel: config.resultLevel,
          resultLabel: game.i18n.localize(`PEN.resultLevel.${config.resultLevel}`),
          outcome: config.outcome,
          outcomeLabel: config.outcomeLabel,
          damRoll: config.damRoll,
          damCrit: config.damCrit,
          damShield: config.damShield,
          damMod: config.damMod,
          subType: config.subType,
          fixedOpp: config.fixedOpp,
          action: config.action,
          actionLabel: game.i18n.localize(`PEN.actions.${config.action}`),
          userID: config.userID,
          neutralRoll: config.neutralRoll,
        },
      ],
    };

    // updated existing card, if any
    const existingOpenCard = await OPCard.checkNewMsg(config);
    if (existingOpenCard) {
      await OPCard.OPAdd(chatMsgData, existingOpenCard);
      return;
    }
    // create a new card
    const html = await PENCheck.startChat(chatMsgData);
    const msgID = await PENCheck.showChat(html, chatMsgData);
    return msgID;
  }
}
