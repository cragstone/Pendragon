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

export class ArmourData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true };
    return {
      source: new StringField({ initial: "" }),
      description: new StringField ({required: true, blank: true, initial: ""}),
      GMdescription: new StringField ({required: true, blank: true, initial: ""}),   
      disadvantage: new StringField ({required: true, blank: true, initial: ""}),
      notes: new StringField ({required: true, blank: true, initial: ""}),  
      padding: new StringField ({required: true, blank: true, initial: ""}),
      material: new StringField ({required: true, blank: true, initial: ""}),         
      equipped: new BooleanField({initial: false}),
      type: new BooleanField({initial: false}),
      poor: new BooleanField({initial: false}),
      libra: new NumberField({ ...requiredInteger, min: 0, initial: 0,}),
      denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0,}),            
      ap: new NumberField({ ...requiredInteger, initial: 0}),
      missPenalty: new NumberField({ ...requiredInteger, initial: 0}),
      yearAvailable: new NumberField({ ...requiredInteger, initial: 0}), 
    };
  }
}
