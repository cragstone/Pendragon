import { RollResult } from "./checks.mjs";
import { FeastDeck } from "../combat/feast-deck.mjs";

export class PendragonCombatTracker extends (foundry.applications?.sidebar?.tabs?.CombatTracker ?? CombatTracker) {
  /** @override */
  static PARTS = {
    header: {
      template: "templates/sidebar/tabs/combat/header.hbs",
    },
    tracker: {
      template: "templates/sidebar/tabs/combat/tracker.hbs",
    },
    footer: {
      template: "systems/Pendragon/templates/sidebar/combat/footer.hbs",
    },
  };

  // override the render for customization
  renderTracker(html) {
    // actual combat - do the standard thing
    if (!this.viewed) return;

    // TODO: allow GM to drag and drop actors to reflect new seats
    const combatants = this.viewed.combatants;
    // feast - add the seating areas
    if (this.viewed.isFeast()) {
      const list = html.querySelector(".directory-list, .combat-tracker");
      this.#addSeating(list, game.i18n.localize("PEN.feast.onFloor"), combatants, RollResult.FUMBLE);
      this.#addSeating(list, game.i18n.localize("PEN.feast.farSalt"), combatants, RollResult.FAIL);
      this.#addSeating(list, game.i18n.localize("PEN.feast.closeSalt"), combatants, RollResult.SUCCESS);
      this.#addSeating(list, game.i18n.localize("PEN.feast.aboveSalt"), combatants, RollResult.CRITICAL);
      this.#addFeastSize(list, this.viewed);

      const combatantRows = html.querySelectorAll("li.combatant[data-combatant-id]");
      for (const row of combatantRows) {
        const combatantId = row.dataset.combatantId ?? "";
        const combatant = this.viewed.combatants.get(combatantId, { strict: true });
        const init = row.querySelector(".token-initiative");
        if (init && combatant.initiative) {
          init.innerText = combatant.actor.system.glory.toLocaleString();
          this.#addGenialityVal(row.querySelector(".token-initiative"), combatant);
        }
        // Adjust controls with system extensions
        for (const controlIcon of row.querySelectorAll(".combatant-control.icon")) {
          controlIcon.classList.add("fa-fw");

          if (controlIcon.dataset.action === "pingCombatant") {
            // Use an icon for the `pingCombatant` control that looks less like a targeting reticle
            controlIcon.classList.remove("fa-bullseye-arrow");
            controlIcon.classList.add("fa-signal-stream");
          }
        }
        // card draw control for the feast deck (GM or the combatant's owner)
        if (FeastDeck.isAvailable() && (game.user.isGM || combatant.isOwner)) {
          this.#addDrawControl(row, combatant);
        }
      }
    }
  }
  _onChangeInput(event) {
    return super._onChangeInput(event);
  }
  #addDrawControl(row, combatant) {
    const controls = row.querySelector(".combatant-controls");
    if (!controls) {
      return;
    }
    const dataset = { combatId: this.viewed.id, combatantId: combatant.id };
    for (const [action, icon, labelKey] of [
      ["feastDraw", "fa-clone", "PEN.feast.drawCard"],
      ["feastGeniality", "fa-plus-minus", "PEN.feast.adjustGeniality"],
    ]) {
      const button = document.createElement("button");
      button.classList.add("combatant-control", "icon", "fa-solid", icon, "fa-fw");
      button.dataset.tooltip = game.i18n.localize(labelKey);
      button.setAttribute("aria-label", game.i18n.localize(labelKey));
      button.addEventListener("click", () => FeastDeck.triggerTrackerAction(dataset, action));
      controls.prepend(button);
    }
  }

  #addGenialityVal(selectedElement, combatant) {
    const d = document.createElement("div");
    const geniality = combatant.getGeniality();
    d.classList.add("token-geniality");
    d.innerHTML = `<span class="geniality-value">${geniality}</span>`;
    selectedElement.insertAdjacentElement("afterend", d);
  }

  #addFeastSize(list, combat) {
    const el = document.createElement("li");
    el.classList.add("feast-size");
    const sizeData = combat.getFeastSizeData();
    const size = combat.getFeastSize();
    const selectTooltip = game.i18n.format("PEN.feast.sizeSelectTooltip", sizeData);
    const selectLabel = game.i18n.localize("PEN.feast.sizeSelect");
    const options = Object.keys(combat.constructor.FEAST_SIZES)
      .map(
        (key) =>
          `<option value="${key}"${key === size ? " selected" : ""}>${game.i18n.localize("PEN.feast.feastSizeName." + key)}</option>`,
      )
      .join("");
    el.innerHTML =
      `<div>${game.i18n.localize("PEN.feast.feastSize")}: ` +
      (game.user.isGM
        ? `<select class="feast-size-select" aria-label="${selectLabel}" data-tooltip="${selectTooltip}">${options}</select>`
        : `<strong>${game.i18n.localize("PEN.feast.feastSizeName." + size)}</strong>`) +
      `</div>`;
    if (game.user.isGM) {
      el.querySelector(".feast-size-select")?.addEventListener("change", (event) => {
        combat.setFlag("Pendragon", "feastSize", event.target.value);
      });
    }
    list.prepend(el);
  }

  #addSeating(list, label, combatants, rollNeeded) {
    const seatingArea = document.createElement("li");
    const above = combatants.filter((c) => Math.floor(c.initiative) == rollNeeded);
    const children = above.length
      ? list.querySelectorAll(
          Array.from(above)
            .map((c) => `[data-combatant-id="${c.id}"]`)
            .join(", "),
        )
      : [];
    seatingArea.classList.add("seating");
    seatingArea.innerHTML = `<h3 class="combat-tracker-header">${label}</h3><ol class="seating-list"></ol>`;
    list.prepend(seatingArea);
    seatingArea.querySelector("ol").replaceChildren(...children);
  }

  _getEntryContextOptions() {
    const getCombatant = (li) => this.viewed.combatants.get(li.dataset.combatantId);
    const options = super._getEntryContextOptions();
    options.push(
      {
        label: "PEN.feast.moveCloser",
        icon: '<i class="fa-solid fa-chevron-up"></i>',
        visible: (li) => game.user.isGM && this.viewed.isFeast() && getCombatant(li)?.initiative < RollResult.CRITICAL,
        onClick: (e, li) => {
          const combatant = getCombatant(li);
          if (!combatant) return;
          combatant.update({ initiative: combatant.initiative + 1 });
        },
      },
      {
        label: "PEN.feast.moveFurther",
        icon: '<i class="fa-solid fa-chevron-down"></i>',
        visible: (li) => game.user.isGM && this.viewed.isFeast() && getCombatant(li)?.initiative >= RollResult.FAIL,
        onClick: (e, li) => {
          const combatant = getCombatant(li);
          if (!combatant) return;
          combatant.update({ initiative: combatant.initiative - 1 });
        },
      },
    );
    return options;
  }
}
