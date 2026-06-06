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

export class RelationshipData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true };
    return {
      source: new StringField({ initial: "" }),
      description: new StringField ({required: true, blank: true, initial: ""}),
      GMdescription: new StringField ({required: true, blank: true, initial: ""}),    
      sourceUuid: new StringField ({required: true, blank: true, initial: ""}), 
      targetUuid: new StringField ({required: true, blank: true, initial: ""}),
      connection: new StringField ({required: true, blank: true, initial: ""}),
      person1Name: new StringField ({required: true, blank: true, initial: ""}),
      person2Name: new StringField ({required: true, blank: true, initial: ""}),
      typeLabel: new StringField ({required: true, blank: true, initial: ""}),    
      born: new NumberField({ ...requiredInteger, initial: 0}),
      squire: new NumberField({ ...requiredInteger, initial: 0}),
    };
  }
}
