const { HTMLField, SchemaField, NumberField, StringField, FilePathField, ArrayField, BooleanField, DataField } =
  foundry.data.fields;

export class IdealData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true };
    return {
      source: new StringField({ initial: "" }),
      description: new StringField({ required: true, blank: true, initial: "" }),
      GMdescription: new StringField({ required: true, blank: true, initial: "" }),
      traitGroupScore: new NumberField({ ...requiredInteger, initial: 0 }),
      glory: new NumberField({ ...requiredInteger, initial: 0 }),
      armour: new NumberField({ ...requiredInteger, initial: 0 }),
      hp: new NumberField({ ...requiredInteger, initial: 0 }),
      hr: new NumberField({ ...requiredInteger, initial: 0 }),
      dam: new NumberField({ ...requiredInteger, initial: 0 }),
      move: new NumberField({ ...requiredInteger, initial: 0 }),
      protect: new BooleanField({ initial: false }),
      traitGroup: new ArrayField(new DataField(), { initial: [] }),
      require: new ArrayField(new DataField(), { initial: [] }),
    };
  }
}
