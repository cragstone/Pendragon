import { PENUtilities } from "../apps/utilities.mjs";
import { PENSelectLists } from "./select-lists.mjs";
import { PendragonStatusEffects } from "./status-effects.mjs";
import PENDialog from "../setup/pen-dialog.mjs";

export class PENCombat {
  //
  //Treat a Wound - First Aid
  //
  static async treatWound(event) {
    const itemID = event.currentTarget.dataset.itemid;
    const item = this.actor.items.get(itemID);
    let healing = 0;
    let usage = await PENCombat.healingAmount(this.actor.name);
    if (usage) {
      healing = Number(usage.treatwound);
    } else {
      return;
    }
    //If amout of healing is zero then simply ignore and stop
    if (healing === 0) {
      return;
    }

    //If amount of healing >- wound then simply delete the wound
    if (healing >= item.system.value) {
      item.delete();
      this.render(true);
      return;
    }

    //Otherwise reduce the wound score by amount healed (or increase if a negative) and set treated status to true
    let checkProp = {
      "system.value": item.system.value - healing,
      "system.treated": true,
    };
    item.update(checkProp);

    //Take the opportunity to delete any wounds with zero damage they may not be visible
    await PENCombat.cleanseWounds(this.actor);
  }

  //
  //Natural Healing
  //
  static async naturalHealing(event) {
    let confirm = await PENUtilities.confirmation(game.i18n.localize("PEN.naturalHeal"));
    if (!confirm) {
      return;
    }
    PENCombat.applyNaturalHealing(this.actor);
  }

  static async applyNaturalHealing(actor, deterioration = 0, markSuccessfulChirurgery = false) {
    const currentHealth = actor.system.hp.value;
    if (deterioration >= currentHealth) {
      return { deterioration, healing: 0, died: true };
    }
    let healing = actor.system.healRate;
    let deterHeal = 0;
    let aggravHeal = 0;
    //If there is CON damage from poisoning then recover that.  This doesn't cost healing
    let conDamage = actor.system.stats.con.poison;
    if (conDamage < 0) {
      conDamage = Math.min(conDamage + healing, 0);
    }

    //If there is deterioration damage then heal that first
    if (actor.system.deterDam + deterioration > 0) {
      deterHeal = Math.min(healing, actor.system.deterDam + deterioration);
      healing = healing - deterHeal;
    }
    if (actor.system.aggravDam > 0) {
      aggravHeal = Math.min(healing, actor.system.aggravDam);
      healing = healing - aggravHeal;
    }

    let successfulChirurgery = actor.system.status.chirurgery;
    if (markSuccessfulChirurgery && actor.system.status.chirurgery == false) {
      successfulChirurgery = true;
    }

    await actor.update({
      "system.deterDam": actor.system.deterDam + deterioration - deterHeal,
      "system.aggravDam": actor.system.aggravDam - aggravHeal,
      "system.stats.con.poison": conDamage,
      "system.status.chirurgery": successfulChirurgery,
    });

    //If not tracking Wounds then just apply Healing Rate to HP value
    if (!game.settings.get("Pendragon", "trackWnd")) {
      let newHP = Math.min(actor.system.hp.value + healing, actor.system.hp.max);
      healing = healing - (newHP - actor.system.hp.value);
      await actor.update({
        "system.hp.value": newHP,
      });
    } else {
      //Put wounds in array and sort lowest to highest damage
      const wounds = actor.items.filter((itm) => itm.type === "wound");
      wounds.sort((a, b) => a.system.value - b.system.value);

      for (const i of wounds) {
        const woundHeal = Math.min(healing, i.system.value);
        const item = actor.items.get(i._id);
        if (woundHeal > 0) {
          await item.update({
            "system.value": i.system.value - woundHeal,
            "system.treated": true,
          });
          healing = healing - woundHeal;
        } else {
          // existing wounds can no longer be treated by first aid
          await item.update({ "system.treated": true });
        }
      }
    }
    // check to see if we remove the debilitation
    let removeDebilitation = false;
    if (successfulChirurgery && actor.system.hp.value >= Math.floor(actor.system.hp.max / 2)) {
      removeDebilitation = true;
      actor.removeStatus(PendragonStatusEffects.DEBILITATED);
      await actor.update({
        "system.status.chirurgery": false,
      });
    }
    await PENCombat.cleanseWounds(actor);
    return { deterioration, healing: actor.system.healRate - healing, died: false, becameHealthy: removeDebilitation };
  }

  //
  //Delete any wounds that have zero or less damage - they may not be visible on the character sheet
  //
  static async cleanseWounds(actor) {
    for (let i of actor.items) {
      if (i.type === "wound" && i.system.value < 1) {
        i.delete();
      }
    }
  }

  //
  // Form to get amount of healing
  //
  static async healingAmount(name) {
    let title = game.i18n.localize("PEN.treat");
    const html = await foundry.applications.handlebars.renderTemplate(
      "systems/Pendragon/templates/dialog/treatWound.hbs",
      {},
    );
    const dlg = await PENDialog.input({
      window: { title: title },
      content: html,
      ok: {
        label: game.i18n.localize("PEN.confirm"),
      },
    });
    return dlg;
  }

  ///add a standard combat wound
  static async addStandardWound(actor, amount) {
    PENCombat.applyDamage(actor, "wound", amount, "hp");
  }
  // apply damage details based on the type, amount, and stat
  static async applyDamage(actor, damType, damAmount, statImpact) {
    let createNew = false;
    let created = false;
    let treated = false;

    //Depending on damage type
    switch (damType) {
      case "wound":
      case "fall":
        createNew = true;
        break;
      case "cold":
        let coldItem = actor.items.filter((itm) => itm.type === "wound" && itm.system.source === "cold")[0];
        if (!coldItem) {
          createNew = true;
          created = true;
          treated = true;
        } else {
          await coldItem.update({
            "system.value": coldItem.system.value + damAmount,
          });
        }

        break;
      case "disease":
        if (statImpact === "hp") {
          createNew = true;
        } else {
          let target = "system.stats." + statImpact + ".disease";
          await actor.update({
            [target]: actor.system.stats[statImpact].disease - damAmount,
          });
          await actor.addStatus(PendragonStatusEffects.DEBILITATED);
        }
        break;
      case "fire":
      case "suffocate":
        let wound = actor.items.filter((itm) => itm.type === "wound" && itm.system.source === damType)[0];
        if (!wound) {
          createNew = true;
          created = true;
          treated = false;
        } else {
          await wound.update({
            "system.value": wound.system.value + damAmount,
            "system.treated": false,
          });
        }
        break;
      case "poison":
        await actor.update({
          "system.stats.con.poison": actor.system.stats.con.poison - damAmount,
        });
        await actor.addStatus(PendragonStatusEffects.DEBILITATED);
        break;
      default:
        ui.notifications.warn(damType + ": " + game.i18n.localize("PEN.noDamType"));
        return;
    }

    let wndName = game.i18n.localize("PEN.minor");
    if (damAmount >= actor.system.hp.max) {
      wndName = game.i18n.localize("PEN.mortal");
    } else if (damAmount >= actor.system.hp.majorWnd) {
      wndName = game.i18n.localize("PEN.major");
    }

    if (createNew) {
      const itemData = {
        name: wndName,
        type: "wound",
        system: {
          value: damAmount,
          treated,
          created,
          source: damType,
        },
      };
      let item = await Item.create(itemData, { parent: actor });
      let key = await game.system.api.pid.guessId(item);
      await item.update({
        "flags.Pendragon.pidFlag.id": key,
        "flags.Pendragon.pidFlag.lang": game.i18n.lang,
        "flags.Pendragon.pidFlag.priority": 0,
      });
      await PENCombat.woundDesc(item, actor);
    }
    return;
  }
  //Add a Wound/Damage
  //
  static async addWound(event) {
    let usage = await PENCombat.woundForm();
    if (!usage) {
      return;
    }
    let damType = usage.damType;
    let damAmount = Number(usage.amount);
    let statImpact = usage.stat;
    if (damAmount < 1) {
      return;
    }
    PENCombat.applyDamage(this.actor, damType, damAmount, statImpact);
  }

  //Add Wound Form
  static async woundForm() {
    const data = {
      damType: await PENSelectLists.getDamageType(),
      attType: await PENSelectLists.getDiseaseImpact(),
    };
    let title = game.i18n.localize("PEN.addWound");
    const html = await foundry.applications.handlebars.renderTemplate(
      "systems/Pendragon/templates/dialog/addWound.hbs",
      data,
    );
    const dlg = await PENDialog.input({
      window: { title: title },
      content: html,
      ok: {
        label: game.i18n.localize("PEN.confirm"),
      },
    });
    return dlg;
  }

  //Update Wound Description
  static async woundDesc(item, actor) {
    if (item.system.created) {
      return;
    }
    // assume a minor wound
    let unconscious = false;
    let dying = false;

    // mortal wound
    if (item.system.value >= actor.system.hp.max) {
      unconscious = true;
      dying = true;
      // major wound
    } else if (item.system.value >= actor.system.hp.majorWnd) {
      unconscious = true;
    }

    // if brought to zero or negative hit points they are dying (near death)
    if (actor.system.hp.value <= 0) {
      dying = true;
    }
    // if below the unconscious threshold mark unconscious
    if (actor.system.hp.value < actor.system.hp.unconscious) {
      unconscious = true;
    }
    let checkProp = { "system.created": true };
    await item.update(checkProp);

    if (unconscious) {
      await actor.addStatus(PendragonStatusEffects.UNCONSCIOUS);
      await actor.addStatus(PendragonStatusEffects.DEBILITATED);
    }
    if (dying) {
      await actor.addStatus(PendragonStatusEffects.DYING);
    }
    return;
  }
}
