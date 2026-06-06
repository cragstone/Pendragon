const { HTMLField, SchemaField, NumberField, StringField, FilePathField, ArrayField, BooleanField, DataField } =
  foundry.data.fields;

export class HorseData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true };
    return {
      source: new StringField({ initial: "" }),
      description: new StringField({ required: true, blank: true, initial: "" }),
      GMdescription: new StringField({ required: true, blank: true, initial: "" }),
      horseCare: new StringField({ required: true, blank: true, initial: "0" }),
      horseHealth: new StringField({ required: true, blank: true, initial: "0" }),
      horseName: new StringField({ required: true, blank: true, initial: "" }),
      cost: new StringField({ required: true, blank: true, initial: "" }),
      features: new StringField({ required: true, blank: true, initial: "" }),
      colour: new StringField({ required: true, blank: true, initial: "" }),
      breed: new StringField({ required: true, blank: true, initial: "" }),
      personality: new StringField({ required: true, blank: true, initial: "" }),
      damage: new StringField({ required: true, blank: true, initial: "" }),
      chargeDmg: new StringField({ required: true, blank: true, initial: "" }),
      equipped: new BooleanField({ initial: false }),
      combat: new BooleanField({ initial: false }),
      special: new BooleanField({ initial: false }),
      poor: new BooleanField({ initial: false }),
      armour: new NumberField({ ...requiredInteger, initial: 0 }),
      move: new NumberField({ ...requiredInteger, initial: 0 }),
      horseArmour: new NumberField({ ...requiredInteger, initial: 0 }),
      age: new NumberField({ ...requiredInteger, initial: 0 }),
      hp: new NumberField({ ...requiredInteger, initial: 0 }),
      maxHP: new NumberField({ ...requiredInteger, initial: 0 }),
      siz: new NumberField({ ...requiredInteger, initial: 0 }),
      dex: new NumberField({ ...requiredInteger, initial: 0 }),
      str: new NumberField({ ...requiredInteger, initial: 0 }),
      con: new NumberField({ ...requiredInteger, initial: 0 }),
      yearAvailable: new NumberField({ ...requiredInteger, initial: 0 }),
    };
  }
}
