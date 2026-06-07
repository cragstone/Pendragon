const { HTMLField, SchemaField, NumberField, StringField, FilePathField, ArrayField, BooleanField } =
  foundry.data.fields;

export class WoundData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true };
    return {
      value: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
      treated: new BooleanField({ initial: false }),
      created: new BooleanField({ initial: false }),
      source: new StringField({ required: true, blank: true, default: "wound" }),
    };
  }
}
