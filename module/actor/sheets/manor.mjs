const { api, sheets } = foundry.applications;
import { PIDEditor } from "../../pid/pid-editor.mjs";
import { PendragonActor } from "../actor.mjs";
import { PENactorItemDrop } from "../actor-itemDrop.mjs";
import { PENUtilities } from "../../apps/utilities.mjs";
import { PID } from "../../pid/pid.mjs";

export class PendragonManorSheet extends api.HandlebarsApplicationMixin(sheets.ActorSheetV2) {
  constructor(options = {}) {
    super(options);
    this._dragDrop = this._createDragDropHandlers();
  }

  static DEFAULT_OPTIONS = {
    classes: ["Pendragon", "sheet", "actor2", "manor"],
    position: {
      width: 600,
      height: 600,
    },
    window: {
      resizable: true,
    },
    tag: "form",
    dragDrop: [{ dragSelector: "[data-drag]", dropSelector: null }],
    form: {
      submitOnChange: true,
    },
    actions: {
      editPid: this._onEditPid,
      onEditImage: this._onEditImage,
      viewDoc: this._viewDoc,
      deleteDoc: this._deleteDoc,
      viewFolk: this._viewFolk,
      deleteFolk: this._deleteFolk,
      viewEnf: this._viewEnf,
      deleteEnf: this._deleteEnf,
    },
  };

  static PARTS = {
    header: {
      template: "systems/Pendragon/templates/actor/manor.header.hbs",
      scrollable: [""],
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs",
    },
    details: {
      template: "systems/Pendragon/templates/actor/manor.details.hbs",
      scrollable: [""],
    },
    notes: {
      template: "systems/Pendragon/templates/actor/manor.notes.hbs",
      scrollable: [""],
    },
    location: {
      template: "systems/Pendragon/templates/actor/manor.location.hbs",
      scrollable: [""],
    },
    improvements: {
      template: "systems/Pendragon/templates/actor/manor.improvements.hbs",
      scrollable: [""],
    },
    mesnie: {
      template: "systems/Pendragon/templates/actor/manor.mesnie.hbs",
      scrollable: [""],
    },
    folk: {
      template: "systems/Pendragon/templates/actor/manor.folk.hbs",
      scrollable: [""],
    },
    gmTab: {
      template: "systems/Pendragon/templates/actor/gmtab.hbs",
      scrollable: [""],
    },
  };

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    //Common parts to the character - this is the order they are show on the sheet
    options.parts = ["header", "tabs", "details", "improvements", "mesnie", "folk", "location", "notes"];

    //GM only tabs
    if (game.user.isGM) {
      options.parts.push("gmTab");
    }
  }

  _getTabs(parts) {
    // If you have sub-tabs this is necessary to change
    const tabGroup = "primary";
    // Default tab for first time it's rendered this session
    if (!this.tabGroups[tabGroup]) {
      this.tabGroups[tabGroup] = "details";
    }
    return parts.reduce((tabs, partId) => {
      const tab = {
        cssClass: "",
        group: tabGroup,
        id: "",
        icon: "",
        label: "PEN.Tabs.",
      };
      switch (partId) {
        case "header":
        case "tabs":
          return tabs;
        case "gmTab":
        case "details":
        case "notes":
        case "location":
        case "folk":
        case "mesnie":
        case "improvements":
          tab.id = partId;
          tab.label += partId;
          break;
      }
      if (this.tabGroups[tabGroup] === tab.id) tab.cssClass = "active";
      tabs[partId] = tab;
      return tabs;
    }, {});
  }

  async _prepareContext(options) {
    let context = await super._prepareContext(options);
    context.editable = this.isEditable;
    context.owner = this.document.isOwner;
    context.limited = this.document.limited;
    context.actor = this.actor;
    context.flags = this.actor.flags;
    context.isGM = game.user.isGM;
    context.system = this.actor.system;
    context.enfeoffedLabel = game.i18n.localize("PEN.manor.dropActor");
    if (this.actor.system.enfeoffed.npc) {
      let tempActor = await fromUuid(this.actor.system.enfeoffed.npc);
      if (tempActor) {
        context.enfeoffedLabel = tempActor.name;
      }
    }
    context.tabs = this._getTabs(options.parts);

    context.enrichedDescriptionValue = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      this.actor.system.description,
      {
        async: true,
        secrets: this.document.isOwner,
        rollData: this.actor.getRollData(),
        relativeTo: this.actor,
      },
    );
    context.enrichedGMDescriptionValue = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      this.actor.system.GMdescription,
      {
        async: true,
        secrets: this.document.isOwner,
        rollData: this.actor.getRollData(),
        relativeTo: this.actor,
      },
    );

    this._prepareItems(context);
    return context;
  }

  async _prepareItems(context) {
    // Initialize containers.
    const improvements = [];
    const folksList = this.actor.system.npcs ?? [];
    const folks = [];
    for (let pActr of folksList) {
      let tempActor = await fromUuid(pActr.uuid);
      if (tempActor) {
        folks.push({
          name: tempActor.name,
          uuid: pActr.uuid,
          typeLabel: game.i18n.localize("PEN." + tempActor.system.subtype),
          valid: true,
          libra: tempActor.system.annualCost.libra,
          denarii: tempActor.system.annualCost.denarii,
        });
      } else {
        folks.push({
          name: pActr.name + " (" + game.i18n.localize("PEN.invalid") + ")",
          uuid: pActr.uuid,
          typeLabel: game.i18n.localize("PEN.invalid"),
          valid: false,
          libra: 0,
          denarii: 0,
        });
      }
    }

    for (let item of this.actor.items) {
      if (item.type === "manorImp") {
        item.label = game.i18n.localize("PEN.manor." + item.system.subtype);
        item.system.dv.label = game.i18n.localize("PEN.dv." + item.system.dv.pos);
        item.statusLabel = game.i18n.localize("PEN.manor." + item.system.status);
        item.assized = false;
        if (item.system.yearAcquired <= this.actor.system.yearAssized) {
          item.assized = true;
        }
        improvements.push(item);
      }
    }
    context.folks = folks.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
    context.improvements = improvements.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
  }

  /** @override */
  async _preparePartContext(partId, context) {
    switch (partId) {
      case "gmTab":
      case "details":
      case "notes":
      case "location":
      case "folk":
      case "mesnie":
      case "improvements":
        context.tab = context.tabs[partId];
        break;
    }
    return context;
  }

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

  //------------ACTIONS-------------------

  // Handle editPid action
  static _onEditPid(event) {
    event.stopPropagation(); // Don't trigger other events
    if (event.detail > 1) return; // Ignore repeated clicks
    new PIDEditor({ document: this.document }, {}).render(true, {
      focus: true,
    });
  }

  // Handle edit Image action
  static async _onEditImage(event, target) {
    const attr = target.dataset.edit;
    const current = foundry.utils.getProperty(this.document, attr);
    const { img } = this.document.constructor.getDefaultArtwork?.(this.document.toObject()) ?? {};
    const fp = new foundry.applications.apps.FilePicker.implementation({
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

  //View an Embedded Document
  static async _viewDoc(event, target) {
    const { itemid } = target.closest("[data-itemid]")?.dataset ?? {};
    const item = this.actor.items.get(itemid);
    if (!item) return;
    item.sheet.render(true);
  }

  //Delete an Embedded Document
  static async _deleteDoc(event, target) {
    if (event.detail === 2) {
      //Only perform on double click
      const { itemid } = target.closest("[data-itemid]")?.dataset ?? {};
      const item = this.actor.items.get(itemid);
      if (!item) return;
      item.delete();
    }
  }

  //View Folk
  static async _viewFolk(event, target) {
    const { itemid } = target.closest("[data-itemid]")?.dataset ?? {};
    const folkActor = await fromUuid(itemid);
    if (!folkActor) return;
    folkActor.sheet.render(true);
  }

  //Delete an Actor from the collection
  static async _deleteFolk(event, target) {
    if (event.detail === 2) {
      const { itemid } = target.closest("[data-itemid]")?.dataset ?? {};
      const coll = this.actor.system.npcs ?? [];
      await this.actor.update({ "system.npcs": coll.filter((itm) => itm.uuid != itemid) });
    }
  }

  //View Enfeoffed NPC
  static async _viewEnf(event, target) {
    if (!this.actor.system.enfeoffed.npc) {
      return;
    }
    const steward = await fromUuid(this.actor.system.enfeoffed.npc);
    if (!steward) return;
    steward.sheet.render(true);
  }

  //Delete an Embedded Document
  static async _deleteEnf(event, target) {
    if (event.detail === 2) {
      //Only perform on double click
      await this.actor.update({
        "system.enfeoffed.npc": "",
      });
    }
  }

  //Create new manor folk actor if appropriate
  static async _manorFolk(estateName, tempActor, ownership) {
    if (tempActor.system.master) {
      const cloneData = tempActor.toObject();
      cloneData.name = cloneData.name + ":" + estateName;
      cloneData.system.master = false;
      cloneData.ownership = ownership;
      //Create the new Actor
      let newActor = await Actor.create(cloneData);

      //Update/create PID for name change
      let tempID = await PID.guessId(newActor);
      let priority = newActor.flags?.Pendragon?.pidFlag?.priority ?? 0;
      await newActor.update({
        "flags.Pendragon.pidFlag.id": tempID,
        "flags.Pendragon.pidFlag.lang": game.i18n.lang,
        "flags.Pendragon.pidFlag.priority": priority,
      });

      //Loop through Actor skills and roll any random ones
      let updates = [];
      let maxScore = 0;
      for (let skill of newActor.system.random) {
        let currSkill = await newActor.items.filter((itm) => itm.flags.Pendragon?.pidFlag?.id === skill.pid)[0];
        let roll = new Roll(skill.value);
        await roll.evaluate();
        if (roll.total > maxScore) {
          maxScore = roll.total;
        }
        updates.push({
          _id: currSkill.id,
          system: {
            value: roll.total,
          },
        });
      }

      //Use the max score to update the cost
      let newCost = newActor.system.annualCost.libra;
      if (maxScore > 15 && maxScore < 20) {
        newCost = newCost + maxScore - 15;
      }
      if (maxScore > 19) {
        newCost = newCost + 5 + (maxScore - 15) * 2;
      }
      await newActor.update({ "system.annualCost.libra": newCost });

      await newActor.updateEmbeddedDocuments("Item", updates);
      return newActor;
    } else {
      return tempActor;
    }
    return false;
  }

  // -----------------------------------LISTENERS-----------------------------------------
  //Activate event listeners using the prepared sheet HTML
  _onRender(context, _options) {
    this._dragDrop.forEach((d) => d.bind(this.element));
  }

  //-------------Drag and Drop--------------

  // Define whether a user is able to begin a dragstart workflow for a given drag selector
  _canDragStart(selector) {
    return this.isEditable;
  }

  //Define whether a user is able to conclude a drag-and-drop workflow for a given drop selector
  _canDragDrop(selector) {
    return this.isEditable;
  }

  //Callback actions which occur at the beginning of a drag start workflow.
  _onDragStart(event) {
    const docRow = event.currentTarget.closest("li");
    if ("link" in event.target.dataset) return;
    // Chained operation
    let dragData = this._getEmbeddedDocument(docRow)?.toDragData();
    if (!dragData) return;
    // Set data transfer
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  //Callback actions which occur when a dragged element is over a drop target.
  _onDragOver(event) {}

  //Callback actions which occur when a dragged element is dropped on a target.
  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    const actor = this.actor;
    const allowed = Hooks.call("dropActorSheetData", actor, this, data);
    if (allowed === false) return;

    // Handle different data types
    switch (data.type) {
      case "ActiveEffect":
        return this._onDropActiveEffect(event, data);
      case "Actor":
        return this._onDropActor(event, data);
      case "Item":
        return this._onDropItem(event, data);
      case "Folder":
        return this._onDropFolder(event, data);
    }
  }

  //Handle the dropping of ActiveEffect data onto an Actor Sheet
  async _onDropActiveEffect(event, data) {
    return false;
  }

  //Dropping an actor on to character
  async _onDropActor(event, data) {
    event.preventDefault();
    event.stopPropagation();
    if (!this.actor.isOwner) return false;
    const collectionName = event.target.closest("[data-collection]")?.dataset.collection ?? "npcs";
    const dataList = await PENUtilities.getDataFromDropEvent(event, "Actor");
    if (!dataList) {
      return false;
    }
    if (collectionName === "enfeoffed") {
      if (this.actor.system.enfeoffed.npc) {
        ui.notifications.warn(game.i18n.localize("PEN.manor.alreadyEnfeoffed"));
        return false;
      }
      await this.actor.update({ "system.enfeoffed.npc": dataList[0].uuid });
      return;
    } else if (collectionName === "npcs") {
      let tempActor = dataList[0];
      if (!tempActor) {
        return;
      }
      if (!["backgroundnpc"].includes(tempActor.type)) {
        return;
      }
      let newActor = await PendragonManorSheet._manorFolk(this.actor.name, tempActor, this.actor.ownership);
      if (!newActor) {
        return;
      }
      let list = this.actor.system.npcs.filter((itm) => itm.uuid === newActor.uuid);
      if (list.length > 0) {
        return;
      }
      const collection = this.actor.system[collectionName]
        ? foundry.utils.duplicate(this.actor.system[collectionName])
        : [];
      //Add Actor to collection
      collection.push({
        name: newActor.name,
        uuid: newActor.uuid,
      });
      await this.actor.update({ [`system.${collectionName}`]: collection });
    }
    return;
  }

  //Handle dropping of an item reference or item data onto an Actor Sheet
  async _onDropItem(event, data) {
    if (!this.actor.isOwner) return false;
    const item = await Item.implementation.fromDropData(data);
    // Handle item sorting within the same Actor
    if (this.actor.uuid === item.parent?.uuid) return this._onSortItem(event, item);
    // Create the owned item
    return this._onDropItemCreate(item, event);
  }

  //Handle dropping of a Folder on an Actor Sheet.
  async _onDropFolder(event, data) {
    if (!this.actor.isOwner) return [];
    const folder = await Folder.implementation.fromDropData(data);
    if (folder.type !== "Item") return [];
    const droppedItemData = await Promise.all(
      folder.contents.map(async (item) => {
        if (!(document instanceof Item)) item = await fromUuid(item.uuid);
        return item;
      }),
    );
    return this._onDropItemCreate(droppedItemData, event);
  }

  //Handle the final creation of dropped Item data on the Actor.
  async _onDropItemCreate(itemData, event) {
    itemData = await PENactorItemDrop._PENonDropItemCreate(this.actor, itemData);
    const list = await this.actor.createEmbeddedDocuments("Item", itemData);
    return list;
  }

  //Returns an array of DragDrop instances
  get dragDrop() {
    return this._dragDrop;
  }

  _dragDrop;

  //Create drag-and-drop workflow handlers for this Application
  _createDragDropHandlers() {
    return this.options.dragDrop.map((d) => {
      d.permissions = {
        dragstart: this._canDragStart.bind(this),
        drop: this._canDragDrop.bind(this),
      };
      d.callbacks = {
        dragstart: this._onDragStart.bind(this),
        dragover: this._onDragOver.bind(this),
        drop: this._onDrop.bind(this),
      };
      return new foundry.applications.ux.DragDrop(d);
    });
  }
}
