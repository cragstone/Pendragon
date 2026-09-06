const { HTMLField, SchemaField, NumberField, StringField, FilePathField, ArrayField, BooleanField, DataField } =
  foundry.data.fields;

export class PassionData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true };
    return {
      source: new StringField({ initial: "" }),
      description: new StringField({ required: true, blank: true, initial: "" }),
      GMdescription: new StringField({ required: true, blank: true, initial: "" }),
      specName: new StringField({ required: true, blank: true, initial: "" }),
      mainName: new StringField({ required: true, blank: true, initial: "" }),
      court: new StringField({ required: true, blank: true, initial: "" }),
      XP: new BooleanField({ initial: false }),
      specialisation: new BooleanField({ initial: false }),
      dishonour: new NumberField({ ...requiredInteger, initial: 0 }),
      value: new NumberField({ ...requiredInteger, initial: 0 }),
      total: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
      homeland: new NumberField({ ...requiredInteger, initial: 0 }),
      inherit: new NumberField({ ...requiredInteger, initial: 0 }),
      sol: new NumberField({ ...requiredInteger, initial: 0 }),
      winter: new NumberField({ ...requiredInteger, initial: 0 }),
      flavour: new StringField({ required: true, blank: true, initial: "", persisted: false }),
    };
  }

  prepareDerivedData() {
    super.prepareDerivedData();

    this.total = this.value + this.inherit + this.sol + this.winter + this.homeland;

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
  }
}
