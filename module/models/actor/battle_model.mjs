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

export class BattleData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true };
    return {
      encounters: new ArrayField(
        new SchemaField({
          name: new StringField({}),
          pid: new StringField({}),
          uuid: new DocumentUUIDField({ type: "Actor" }),
          migrateRequired: new BooleanField({ initial: false, persisted: false }),
        }),
      ),
      knights: new ArrayField(new ForeignDocumentField(foundry.documents.BaseActor)),
      shortDesc: new StringField({ required: true, blank: true, initial: "" }),
      fieldPos: new StringField({ required: true, blank: true, initial: "" }),
      description: new HTMLField({ required: true, blank: true, initial: "" }),
      notes: new HTMLField({ required: true, blank: true, initial: "" }),
      maxTurns: new NumberField({ ...requiredInteger, initial: 8 }),
      currTurn: new NumberField({ ...requiredInteger, initial: 1 }),
      battleScore: new NumberField({ ...requiredInteger, initial: 0 }),
      intensity: new NumberField({ ...requiredInteger, initial: 0 }),
      maxMorale: new NumberField({ ...requiredInteger, initial: 0 }),
      currMorale: new NumberField({ ...requiredInteger, initial: 0 }),
      lock: new BooleanField({ initial: false }),
      noteView: new BooleanField({ initial: false }),
      resultsView: new BooleanField({ initial: false }),
      descripView: new BooleanField({ initial: false }),
      encView: new BooleanField({ initial: false }),
    };
  }

  static migrateData(source) {
    // migrate from {uuid: "Actor.id"} to documentId for ForeignDocumentField
    if (source.knights) {
      source.knights = source.knights.map((m) => {
        if (foundry.utils.getType(m) !== "Object") return m;
        if (m.uuid.startsWith("Actor.")) return m.uuid.slice(6);
        return m;
      });
    }

    // Move back to storing a label (name), UUID and PID for encounters
    if (source.encounters) {
      source.encounters = source.encounters.map((m) => {
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

  async getKnights() {
    return this.knights.map((a) => ({ actor: a() }));
  }
  async addKnight(actor) {
    const membersCollection = this.toObject().knights;
    membersCollection.push(actor.id);
    return this.parent.update({ "system.knights": membersCollection });
  }

  async removeKnight(actor) {
    const membersCollection = this.toObject().knights;
    let actorId = actor;
    if (actor instanceof Actor) actorId = actor.id;
    membersCollection.findSplice((u) => u == actorId);
    return this.parent.update({ "system.knights": membersCollection });
  }
}
