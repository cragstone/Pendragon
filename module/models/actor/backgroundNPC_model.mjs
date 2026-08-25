const { HTMLField, SchemaField, NumberField, StringField, FilePathField, ArrayField, BooleanField, ObjectField } =
  foundry.data.fields;

export class BackgroundNPCData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true };
    return {
      subtype: new StringField({ required: true, blank: true, initial: "professional" }),
      description: new HTMLField({ required: true, blank: true, initial: "" }),
      annualCost: new SchemaField({
        //Annual maintenance cost
        libra: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
        denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
      }),
      random: new ArrayField(new ObjectField()),
      master: new BooleanField({ initial: true }),
    };
  }
}
