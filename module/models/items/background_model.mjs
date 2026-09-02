import { PENItemData } from "./base_item_model.mjs";

const { HTMLField, SchemaField, NumberField, StringField, FilePathField, ArrayField, BooleanField, ObjectField } =
  foundry.data.fields;

export class BackgroundData extends PENItemData {
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true };
    return {
      subtype: new StringField({ required: true, blank: true, initial: "professional" }),
      description: new HTMLField({ required: true, blank: true, initial: "" }),
      annualCost: new SchemaField({
        //Basic Annual maintenance cost
        libra: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
        denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
      }),
      skillCost: new SchemaField({
        //Cost for increased skills
        libra: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
        denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
      }),
      totalCost: new SchemaField({
        //Total Annual maintenance cost
        libra: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
        denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
      }),            
      skills: new ArrayField(new ObjectField()),
      starting: new BooleanField({ initial: false }),
      born: new NumberField({ ...requiredInteger, min: 0, initial: 0}),
      died: new NumberField({ ...requiredInteger, min: 0, initial: 0}),
    };
  }
}
