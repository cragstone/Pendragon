const {
  HTMLField,
  SchemaField,
  NumberField,
  StringField,
  FilePathField,
  ArrayField,
  BooleanField,
  DataField,
} = foundry.data.fields;

export class SquireData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true };
    return {
      source: new StringField({ initial: "" }),
      description: new StringField ({required: true, blank: true, initial: ""}),
      GMdescription: new StringField ({required: true, blank: true, initial: ""}),   
      category: new StringField ({required: true, blank: true, initial: ""}),      
      age: new NumberField({ ...requiredInteger, initial: 14}),
      skill: new NumberField({ ...requiredInteger, initial: 15}),
      knightMod: new NumberField({ ...requiredInteger, initial: 0}),
      glory: new NumberField({ ...requiredInteger, initial: 0}),      
    };
  }
}
