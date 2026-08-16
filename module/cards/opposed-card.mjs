import { PENCheck } from "../apps/checks.mjs";

export class OPCard {
  //Add a new skill etc to an Opposed Card
  static async OPAdd(config, msgId) {
    if (game.user.isGM) {
      let targetMsg = await game.messages.get(msgId);
      if (targetMsg.flags.Pendragon.chatCard.length >= 2 && ["CO"].includes(targetMsg.flags.Pendragon.cardType)) {
        ui.notifications.warn(game.i18n.localize("PEN.resolveMax2"));
        return;
      } else if (
        targetMsg.flags.Pendragon.chatCard.length >= 5 &&
        ["OP"].includes(targetMsg.flags.Pendragon.cardType)
      ) {
        ui.notifications.warn(game.i18n.localize("PEN.resolveMax5"));
        return;
      }

      let newChatCards = targetMsg.flags.Pendragon.chatCard;
      newChatCards.push(config.chatCard[0]);
      await targetMsg.update({ "flags.Pendragon.chatCard": newChatCards });
      const pushhtml = await PENCheck.startChat(targetMsg.flags.Pendragon);
      await targetMsg.update({ content: pushhtml });
    } else {
      const availableGM = game.users.find((d) => d.active && d.isGM)?.id;
      if (availableGM) {
        game.socket.emit("system.Pendragon", {
          type: "OPAdd",
          to: availableGM,
          value: { config, msgId },
        });
      } else {
        ui.notifications.warn(game.i18n.localize("PEN.noAvailableGM"));
      }
    }
  }

  //Remove a skill etc from an opposed card
  static async OPRemove(config) {
    let targetMsg = await game.messages.get(config.targetChatId);
    let rank = config.dataset.rank;
    let newChatCards = targetMsg.flags.Pendragon.chatCard;
    newChatCards.splice(rank, 1);
    await targetMsg.update({ "flags.Pendragon.chatCard": newChatCards });
    return;
  }

  //Resolve a combined card - roll dice, update and close
  static async OPResolve(config) {
    let targetMsg = await game.messages.get(config.targetChatId);
    let chatCards = targetMsg.flags.Pendragon.chatCard;
    let newchatCards = [];

    if (chatCards.length < 2) {
      ui.notifications.warn(game.i18n.localize("PEN.resolveMore"));
      return;
    }

    //Make Crit Adjusts per game setting (value is zero if setting not used)
    if (game.settings.get("Pendragon", "critAdj")) {
      let minTarget = 99;
      for (let i of chatCards) {
        minTarget = Math.min(minTarget, i.grossTarget - 20);
      }
      minTarget = Math.max(minTarget, 0);

      //Reduce Crit Bonuses and recalc success if minTarget > 0
      if (minTarget > 0) {
        for (let i of chatCards) {
          i.critBonus = i.critBonus - minTarget;
          i.rollVal = i.rollVal - minTarget;
          i.resultLevel = await PENCheck.successLevel({
            targetScore: i.targetScore,
            rollVal: i.rollVal,
          });
          i.resultLabel = game.i18n.localize("PEN.resultLevel." + i.resultLevel);
        }
      }
    }

    //Sort chatCards by result level, and then roll
    chatCards.sort(function (a, b) {
      let r = a.rollVal;
      let s = b.rollVal;
      let p = a.resultLevel;
      let q = b.resultLevel;
      if (p > q) {
        return -1;
      }
      if (p < q) {
        return 1;
      }
      if (r > s) {
        return -1;
      }
      if (r < s) {
        return 1;
      }
      return 0;
    });

    let bestResult = chatCards[0].resultLevel;
    let bestRoll = chatCards[0].rollVal;
    let bestCount = 0;
    let friendly = true;

    //Now work out the number of best results
    for (let i of chatCards) {
      if (i.actorType != "character") {
        friendly = false;
      }
      if (bestResult === 1 && i.resultLevel === bestResult) {
        bestCount++;
      } else if (i.resultLevel === bestResult && i.rollVal === bestRoll) {
        bestCount++;
      }
    }

    //Now work out the result for each chatcard
    let count = 0;
    for (let i of chatCards) {
      if (i.resultLevel === 3 && bestCount === 1) {
        i.outcome = "W";
      } else if (i.resultLevel === 3) {
        i.outcome = "T";
      } else if (i.resultLevel < 2) {
        i.outcome = "L";
      } else {
        if (bestResult === 3) {
          i.outcome = "P";
        } else if (i.rollVal === bestRoll) {
          if (bestCount === 1) {
            i.outcome = "W";
          } else {
            i.outcome = "T";
          }
        } else {
          i.outcome = "P";
        }
      }
      i.outcomeLabel = game.i18n.localize("PEN.comRoll" + i.outcome);
      newchatCards.push(i);
      if (count === chatCards.length - 1) {
        await OPCard.showDiceRoll(i, true);
      } else {
        await OPCard.showDiceRoll(i, false);
      }

      //Check for auto XP improvement
      if (game.settings.get("Pendragon", "autoXP") && i.resultLevel != 1) {
        if ((friendly && i.outcome === "W") | !friendly) {
          await PENCheck.tickXP(i);
        }
      }
      count++;
    }

    //Update and rerend the chat card
    await targetMsg.update({ "flags.Pendragon.chatCard": newchatCards, "flags.Pendragon.state": "closed" });
    const pushhtml = await PENCheck.startChat(targetMsg.flags.Pendragon);
    await targetMsg.update({ content: pushhtml });
    return;
  }

  //Check to see if there is an open card that matches the cardType that's not more than a day old
  static async checkNewMsg(config) {
    //Newest first so a roll always joins the most recent open card
    let messages = ui.chat.collection
      .filter((message) => {
        return (
          config.cardType === message.getFlag("Pendragon", "cardType") &&
          message.getFlag("Pendragon", "state") !== "closed"
        );
      })
      .sort((a, b) => b.timestamp - a.timestamp);

    // Old messages can't be used - if a message is more than a day old mark it as resolved and keep looking
    const now = new Date();
    for (let message of messages) {
      const timeDiffSec = (now - new Date(message.timestamp)) / 1000;
      if (60 * 60 * 24 < timeDiffSec) {
        await message.setFlag("Pendragon", "state", "closed");
        continue;
      }
      return message.id;
    }

    return false;
  }

  static async OPClose(config) {
    let targetMsg = await game.messages.get(config.targetChatId);
    await targetMsg.update({
      "flags.Pendragon.state": "closed",
      "flgs.Pendragon.successLevel": -1,
      "flags.Pendragon.chatCard": [],
    });
    const pushhtml = await PENCheck.startChat(targetMsg.flags.Pendragon);
    await targetMsg.update({ content: pushhtml });
    return;
  }

  static async showDiceRoll(chatCard, delay) {
    //If this is an Opposed or Combat roll then for the dice to roll if Dice so Nice used
    if (game.modules.get("dice-so-nice")?.active) {
      const diceData = {
        throws: [
          {
            dice: [
              {
                resultLabel: chatCard.rollResult,
                result: chatCard.rollResult,
                type: "d20",
                options: "",
                vectors: [],
              },
            ],
          },
        ],
      };
      if (delay && game.settings.get("Pendragon", "delayDice")) {
        await game.dice3d.show(diceData, game.users.get(chatCard.userID), true, null, false); //Dice Data,user,sync,whispher,blind
      } else {
        game.dice3d.show(diceData, game.users.get(chatCard.userID), true, null, false); //Dice Data,user,sync,whispher,blind
      }
    }
    return;
  }
}
