import { PIDEditor } from "../../pid/pid-editor.mjs";

const { api, sheets } = foundry.applications;

export class PendragonActorSheet extends api.HandlebarsApplicationMixin(sheets.ActorSheetV2) {
  constructor(options = {}) {
    super(options);
  }
  // handle editPid action
  static _onEditPid(event) {
    event.stopPropagation(); // Don't trigger other events
    if (event.detail > 1) return; // Ignore repeated clicks
    new PIDEditor(this.actor, {}).render(true, { focus: true });
  }

  // adds the PID editor to the sheet frame
  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    //define button
    const sheetPID = this.actor.flags?.Pendragon?.pidFlag;
    const noId = typeof sheetPID === "undefined" || typeof sheetPID.id === "undefined" || sheetPID.id === "";
    //add button
    const label = game.i18n.localize("PEN.PIDFlag.id");
    const pidEditor = `<button type="button" class="header-control fa-solid fa-fingerprint icon ${noId ? "edit-pid-warning" : "edit-pid-exisiting"}"
        data-action="editPid" data-tooltip="${label}" aria-label="${label}"></button>`;
    let el = this.window.close;
    while (el.previousElementSibling.localName === "button") {
      el = el.previousElementSibling;
    }
    el.insertAdjacentHTML("beforebegin", pidEditor);
    return frame;
  }

  // handle the editImage action
  static async _onEditImage(event, target) {
    const attr = target.dataset.edit;
    const current = foundry.utils.getProperty(this.document, attr);
    const { img } = this.document.constructor.getDefaultArtwork?.(this.document.toObject()) ?? {};
    const fp = new FilePicker({
      current,
      type: "image",
      redirectToRoot: img ? [img] : [],
      callback: (path) => {
        this.document.update({ [attr]: path });
      },
      top: this.position.top + 40,
      left: this.position.left + 10,
    });
    return fp.browse();
  }

  // simplify standard tab initialisation
  _initTabs(group, tabNames) {
    const tabs = {};
    tabNames.forEach((name) => {
      tabs[name] = {
        cssClass: this.tabGroups[group] === name ? "active" : "",
        group,
        id: name,
        label: `PEN.${name}`,
      };
    });
    return tabs;
  }

  // this overload allows us to do fancy tooltips
  async _onRender(context, options) {
    // handle the document per normal
    await super._onRender(context, options);

    // in main document key some element with data-reference="sample-uuid"
    // here we turn this into data-tooltip
    this.element.querySelectorAll("[data-reference]").forEach((e) => this._processReference(e));
  }

  // turn data-reference into data-tooltip
  _processReference(element) {
    // skip if already handled
    if ("tooltip" in element.dataset) return;
    const uuid = element.dataset.reference;
    // set the tooltip with a loading spinner
    // the apps/tooltips.mjs code loads the document and render as a tooltip
    const placeholder = `<section class="loading" data-uuid="${uuid}"><i class="fas fa-spinner fa-spin-pulse" inert></i></section>`;
    element.dataset.tooltip = placeholder;
  }
}
