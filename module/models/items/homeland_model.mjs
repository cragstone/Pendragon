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

export class HomelandData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true };
    return {
      source: new StringField({ initial: "" }),
      description: new StringField ({required: true, blank: true, initial: ""}),
      GMdescription: new StringField ({required: true, blank: true, initial: ""}),    
      passions: new ArrayField(new DataField, { initial: [] }),   
    };
  }
}
