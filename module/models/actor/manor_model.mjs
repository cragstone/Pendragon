const {
  HTMLField,
  SchemaField,
  NumberField,
  StringField,
  DocumentUUIDField,
  ForeignDocumentField,
  ArrayField,
  ObjectField,
  BooleanField,
  FilePathField,
} = foundry.data.fields;

export class ManorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true };
    return {
      description: new HTMLField({ required: true, blank: true, initial: "" }),
      GMdescription: new HTMLField({ required: true, blank: true, initial: "" }),
      dv: new SchemaField({
        outworks: new SchemaField({
          value: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
          label: new StringField({ required: true, blank: true, initial: "", persisted: false }),
        }),
        outerbailey: new SchemaField({
          value: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
          label: new StringField({ required: true, blank: true, initial: "", persisted: false }),
        }),
        innerbailey: new SchemaField({
          value: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
          label: new StringField({ required: true, blank: true, initial: "", persisted: false }),
        }),
        motte: new SchemaField({
          value: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
          label: new StringField({ required: true, blank: true, initial: "", persisted: false }),
        }),
        stronghold: new SchemaField({
          value: new NumberField({ ...requiredInteger, initial: 0, persisted: false }),
          label: new StringField({ required: true, blank: true, initial: "", persisted: false }),
        }),
      }),
      currVal: new SchemaField({
        libra: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
        denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
      }),
      rent: new SchemaField({
        libra: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
        denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
      }),
      cost: new SchemaField({
        libra: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
        denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
      }),
      armyCost: new SchemaField({
        libra: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
        denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
      }),
      income: new SchemaField({
        libra: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
        denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
      }),
      folkCost: new SchemaField({
        libra: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
        denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
      }),
      yearAssized: new NumberField({ ...requiredInteger, initial: 0 }),
      mapImage: new FilePathField({
        required: true,
        categories: ["IMAGE"],
        initial: "systems/Pendragon/assets/sample_manor_img.webp",
      }),
      mesnie: new SchemaField({
        garrisonSoldier: new SchemaField({
          entitled: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          employed: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
          total: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          costPer: new SchemaField({
            libra: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
            denarii: new NumberField({ ...requiredInteger, min: 0, initial: 120 }),
          }),
          costTotal: new SchemaField({
            libra: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
            denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          }),
        }),
        crossbowman: new SchemaField({
          entitled: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          employed: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
          total: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          costPer: new SchemaField({
            libra: new NumberField({ ...requiredInteger, min: 0, initial: 1 }),
            denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
          }),
          costTotal: new SchemaField({
            libra: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
            denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          }),
        }),
        spearman: new SchemaField({
          entitled: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          employed: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
          total: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          costPer: new SchemaField({
            libra: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
            denarii: new NumberField({ ...requiredInteger, min: 0, initial: 120 }),
          }),
          costTotal: new SchemaField({
            libra: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
            denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          }),
        }),
        houseKnights: new SchemaField({
          entitled: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          employed: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
          total: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          costPer: new SchemaField({
            libra: new NumberField({ ...requiredInteger, min: 0, initial: 4 }),
            denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
          }),
          costTotal: new SchemaField({
            libra: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
            denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          }),
        }),
        mercKnights: new SchemaField({
          entitled: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          employed: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
          total: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          costPer: new SchemaField({
            libra: new NumberField({ ...requiredInteger, min: 0, initial: 4 }),
            denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
          }),
          costTotal: new SchemaField({
            libra: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
            denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          }),
        }),
        vetmercKnights: new SchemaField({
          entitled: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          employed: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
          total: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          costPer: new SchemaField({
            libra: new NumberField({ ...requiredInteger, min: 0, initial: 5 }),
            denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
          }),
          costTotal: new SchemaField({
            libra: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
            denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
          }),
        }),
      }),
      armyTotal: new NumberField({ ...requiredInteger, min: 0, initial: 0, persisted: false }),
      npcs: new ArrayField(new ObjectField()),
      enfeoffed: new SchemaField({
        npc: new DocumentUUIDField({ type: "Actor" }),
        npcName: new StringField({ required: true, blank: true, initial: "", persisted: false }),
        active: new BooleanField({ initial: false }),
      }),
    };
  }
}
