const {
  HTMLField,
  SchemaField,
  NumberField,
  StringField,
  DocumentUUIDField,
  ForeignDocumentField,
  ArrayField,
  BooleanField,
} = foundry.data.fields;

export class EncounterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true };
    return {
      npcs: new ArrayField(
        new SchemaField({
          name: new StringField({}),
          pid: new StringField({}),
          uuid: new DocumentUUIDField({ type: "Actor" }),
          migrateRequired: new BooleanField({ initial: false, persisted: false }),
        }),
      ),
      shortDesc: new StringField({ required: true, blank: true, initial: "" }),
      moraleLoss: new StringField({ required: true, blank: true, initial: "" }),
      description: new HTMLField({ required: true, blank: true, initial: "" }),
      notes: new HTMLField({ required: true, blank: true, initial: "" }),
      moraleMin: new NumberField({ ...requiredInteger, initial: 0 }),
      numOpp: new NumberField({ required: true, nullable: false, initial: 1 }),
      npcView: new NumberField({ ...requiredInteger, initial: 99 }),
      opportunity: new BooleanField({ initial: false }),
      lock: new BooleanField({ initial: false }),
      noteView: new BooleanField({ initial: false }),
      used: new BooleanField({ initial: false }),
    };
  }

  static migrateData(source) {
    // Move back to storing a label (name), UUID and PID
    if (source.npcs) {
      source.npcs = source.npcs.map((m) => {
        if (typeof m === "string") {
          m = {
            name: "",
            pid: "",
            uuid: m,
            migrateRequired: true,
          };
        }
        return m;
      });
    }
    return source;
  }
}
