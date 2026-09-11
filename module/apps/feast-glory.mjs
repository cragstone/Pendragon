import PENDialog from "../setup/pen-dialog.mjs";
import { PENUtilities } from "./utilities.mjs";

export class FeastGlory {
  // GMH p. 44: dialog to award Feasting Glory when a feast combat ends
  static async showDialog(combat) {
    const sizeData = combat.getFeastSizeData();
    const knights = combat.combatants
      .filter((c) => c.actor?.type === "character")
      .map((c) => {
        const app = c.actor.system.stats.app.total;
        const geniality = c.getEventGeniality();
        return {
          combatantId: c.id,
          actorId: c.actor.id,
          name: c.name,
          app,
          geniality,
          rounds: combat.round,
          glory: Math.min(100, (app + geniality) * combat.round),
          bonus: 0,
          qualify: geniality >= sizeData.threshold,
        };
      });
    // bonus Glory for the most notable attendee; ties broken by highest Glory
    const qualifiers = knights.filter((k) => k.qualify);
    if (qualifiers.length) {
      const winner = qualifiers.reduce(
        (best, k) =>
          k.geniality > best.geniality || (k.geniality === best.geniality && k.glory > best.glory) ? k : best,
      );
      winner.bonus = sizeData.bonus;
    }
    const data = {
      combatName: combat.name ?? "",
      sizeLabel: game.i18n.localize("PEN.feast.feastSize." + combat.getFeastSize()),
      threshold: sizeData.threshold,
      bonusGlory: sizeData.bonus,
      knights,
    };
    const html = await foundry.applications.handlebars.renderTemplate(
      "systems/Pendragon/templates/dialog/feastGlory.hbs",
      data,
    );
    const awards = await PENDialog.input({
      window: {
        title: game.i18n.localize("PEN.feast.feastGlory"),
      },
      position: {
        width: 620,
      },
      content: html,
    });
    if (!awards) {
      return false;
    }
    await this.createAwards(awards, knights);
    return true;
  }

  // create history items with the awarded glory (same flow as the GM glory award)
  static async createAwards(awards, knights) {
    const feastName = awards.feastName ?? game.i18n.localize("PEN.feast.feastGlory");
    let count = 0;
    for (let knight of knights) {
      const id = knight.combatantId;
      const geniality = Number(awards.geniality?.[id] ?? knight.geniality);
      const rounds = Number(awards.rounds?.[id] ?? knight.rounds);
      // unless the GM overrode the glory, recompute from geniality/rounds edits
      const gloryInput = Number(awards.glory?.[id]);
      const glory = gloryInput === knight.glory ? Math.min(100, (knight.app + geniality) * rounds) : gloryInput;
      const total = glory + Number(awards.bonus?.[id] ?? 0);
      if (!Number.isFinite(total) || total <= 0) {
        continue;
      }
      const actor = game.actors.get(knight.actorId);
      if (!actor) {
        continue;
      }
      const itemData = {
        name: feastName,
        type: "history",
        system: {
          year: game.time.components.year,
          description: feastName,
          glory: total,
        },
        flags: {
          Pendragon: {
            pidFlag: {
              id: "i.history.gmAward",
              lang: game.i18n.lang,
              priority: 0,
            },
          },
        },
      };
      await Item.create(itemData, { parent: actor });
      count++;
    }
    if (count > 0) {
      game.socket.emit("system.rol", {
        type: "updatechar",
      });
    }
    PENUtilities.updateCharSheets();
  }
}