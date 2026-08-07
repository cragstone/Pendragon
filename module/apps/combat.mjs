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
    let newWound = item.system.value;
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

    let healing = this.actor.system.healRate;
    let deterHeal = 0;
    let aggravHeal = 0;
    //If there is CON damage from poisoning then recover that.  This doesnt cost healing
    let conDamage = this.actor.system.stats.con.poison;
    if (conDamage < 0) {
      conDamage = Math.min(conDamage + healing, 0);
    }

    //If there is deterioration damage then heal that first
    if (this.actor.system.deterDam > 0) {
      deterHeal = Math.min(healing, this.actor.system.deterDam);
      healing = healing - deterHeal;
    }
    if (this.actor.system.aggravDam > 0) {
      aggravHeal = Math.min(healing, this.actor.system.aggravDam);
      healing = healing - aggravHeal;
    }

    await this.actor.update({
      "system.deterDam": this.actor.system.deterDam - deterHeal,
      "system.aggravDam": this.actor.system.aggravDam - aggravHeal,
      "system.stats.con.poison": conDamage,
    });

    //If not tracking Wounds then just apply Healing Rate to HP value
    if (!game.settings.get("Pendragon", "trackWnd")) {
      let newHP = Math.min(this.actor.system.hp.value + healing, this.actor.system.hp.max);
      await this.actor.update({
        "system.hp.value": newHP,
      });
      return;
    }

    //Put wounds in array and sort lowest to highest damage
    let wounds = [];
    for (let i of this.actor.items) {
      if (i.type === "wound") {
        wounds.push(i);
      }
    }
    wounds.sort(function (a, b) {
      let x = a.system.value;
      let y = b.system.value;
      if (x < y) {
        return -1;
      }
      if (x > y) {
        return 1;
      }
      return 0;
    });

    let updatedWounds = [];
    for (let i of wounds) {
      let woundHeal = Math.min(healing, i.system.value);
      if (woundHeal > 0) {
        updatedWounds.push({
          _id: i._id,
          "system.value": i.system.value - woundHeal,
        });
        healing = healing - woundHeal;
      }
    }
    if (updatedWounds) {
      await this.actor.updateEmbeddedDocuments("Item", updatedWounds);
    }
    await PENCombat.cleanseWounds(this.actor);
    return;
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
        let coldItem = this.actor.items.filter((itm) => itm.type === "wound" && itm.system.source === "cold")[0];
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
          await this.actor.update({
            [target]: this.actor.system.stats[statImpact].disease - damAmount,
          });
          await actor.addStatus(PendragonStatusEffects.DEBILITATED);
        }
        break;
      case "fire":
      case "suffocate":
        let wound = this.actor.items.filter((itm) => itm.type === "wound" && itm.system.source === damType)[0];
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
        await this.actor.update({
          "system.stats.con.poison": this.actor.system.stats.con.poison - damAmount,
        });
        await actor.addStatus(PendragonStatusEffects.DEBILITATED);
        break;
      default:
        ui.notifications.warn(damType + ": " + game.i18n.localize("PEN.noDamType"));
        return;
    }

    let wndName = game.i18n.localize("PEN.minor");
    if (damAmount >= this.actor.system.hp.max) {
      wndName = game.i18n.localize("PEN.mortal");
    } else if (damAmount >= this.actor.system.hp.majorWnd) {
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
      let item = await Item.create(itemData, { parent: this.actor });
      let key = await game.system.api.pid.guessId(item);
      await item.update({
        "flags.Pendragon.pidFlag.id": key,
        "flags.Pendragon.pidFlag.lang": game.i18n.lang,
        "flags.Pendragon.pidFlag.priority": 0,
      });
      await PENCombat.woundDesc(item, this.actor);
    }
    return;
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
    let unconscious = false;
    let dying = false;

    if (item.system.value >= actor.system.hp.max) {
      unconscious = true;
    } else if (item.system.value >= actor.system.hp.majorWnd) {
      unconscious = true;
    }

    //Check to see if damage >= current HP
    if (actor.system.hp.value < actor.system.hp.unconscious) {
      unconscious = true;
      dying = true;
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
