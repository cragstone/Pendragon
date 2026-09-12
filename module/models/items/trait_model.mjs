const { HTMLField, SchemaField, NumberField, StringField, FilePathField, ArrayField, BooleanField, DataField } =
  foundry.data.fields;

export class TraitData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true };
    return {
      source: new StringField({ initial: "" }),
      description: new StringField({ required: true, blank: true, initial: "" }),
      GMdescription: new StringField({ required: true, blank: true, initial: "" }),
      oppName: new StringField({ required: true, blank: true, initial: "" }),
      directed: new StringField({ required: true, blank: true, initial: "" }),
      XP: new BooleanField({ initial: false }),
      oppXP: new BooleanField({ initial: false }),
      value: new NumberField({ ...requiredInteger, initial: 0 }),
      religious: new NumberField({ ...requiredInteger, initial: 0 }),
      winter: new NumberField({ ...requiredInteger, initial: 0 }),
      total: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
      oppvalue: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
      flavour: new StringField({ required: true, blank: true, initial: "", persisted: false }),
      oppFlavour: new StringField({ required: true, blank: true, initial: "", persisted: false }),
      npcSource: new StringField({ required: true, blank: true, initial: "" }),
    };
  }

  prepareDerivedData() {
    super.prepareDerivedData();

    let tempTotal = this.value + this.religious + this.winter;
    if (tempTotal > 20) {
      this.total = tempTotal;
      this.oppvalue = 0;
    } else if (tempTotal < 0) {
      this.total = 0;
      this.oppvalue = 20 - tempTotal;
    } else {
      this.total = tempTotal;
      this.oppvalue = 20 - tempTotal;
    }

    //Flavour Labels
    if (this.total < 5) {
      this.flavour = game.i18n.localize("PEN.unsung");
    } else if (this.total > 20) {
      this.flavour = game.i18n.localize("PEN.exalted");
    } else if (this.total > 15) {
      this.flavour = game.i18n.localize("PEN.famous");
    } else {
      this.flavour = "";
    }
    if (this.oppvalue < 5) {
      this.oppFlavour = game.i18n.localize("PEN.unsung");
    } else if (this.oppvalue > 20) {
      this.oppFlavour = game.i18n.localize("PEN.exalted");
    } else if (this.oppvalue > 15) {
      this.oppFlavour = game.i18n.localize("PEN.famous");
    } else {
      this.oppFlavour = "";
    }
  }
}
