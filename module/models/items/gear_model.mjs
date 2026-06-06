const {
  HTMLField,
  SchemaField,
  NumberField,
  StringField,
  FilePathField,
  ArrayField,
  BooleanField,
} = foundry.data.fields;

export class GearData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true };
    return {
      quantity: new NumberField({ ...requiredInteger, min: 0, initial: 1,}),
      libra: new NumberField({ ...requiredInteger, min: 0, initial: 0,}),
      denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0,}),            
      source: new StringField({ initial: "" }),
      description: new StringField ({required: true, blank: true, inital: ""}),
      GMdescription: new StringField ({required: true, blank: true, initial: ""}),      
    };
  }
}
