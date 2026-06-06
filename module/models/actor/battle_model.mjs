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
      encounters: new ArrayField(new StringField()),
      knights: new ArrayField(
        new ForeignDocumentField(foundry.documents.BaseActor),
      ),
      shortDesc: new StringField({ required: true, blank: true, initial: ""}),
      fieldPos: new StringField({ required: true, blank: true, initial: ""}),
      description: new HTMLField({ required: true, blank: true, initial: ""}),
      notes: new HTMLField({ required: true, blank: true, initial: ""}),
      maxTurns: new NumberField({ ...requiredInteger, initial: 8 }),
      currTurn: new NumberField({ ...requiredInteger, initial: 1 }),
      battleScore: new NumberField({ ...requiredInteger, initial: 0 }),
      intensity: new NumberField({ ...requiredInteger, initial: 0 }),
      maxMorale: new NumberField({ ...requiredInteger, initial: 0 }),
      currMorale: new NumberField({ ...requiredInteger, initial: 0 }),
      lock: new BooleanField({ initial: false}),
      noteView: new BooleanField({initial: false}),
      resultsView: new BooleanField({initial: false}),      
      descripView: new BooleanField({initial: false}),
      encView: new BooleanField({initial: false}),
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

    // we are only storing UUIDs after migration
    if (source.encounters) {
      source.encounters = source.encounters.map((m) => {
        if (foundry.utils.getType(m) !== "Object") return m;
        if (m.uuid) return m.uuid;
        return m;
      });
    }
    return source;
  }

  async getEncounters() {
    // Batch compendium lookups when retrieving members.
    const collections = new Map();
    const members = new Map();
    const worldMembers = [];

    for (const uuid of this.encounters) {
      const { collection, id } = foundry.utils.parseUuid(uuid);
      if (
        collection instanceof foundry.documents.collections.CompendiumCollection
      ) {
        let ids = collections.get(collection);
        if (!ids) {
          ids = [];
          collections.set(collection, ids);
        }
        ids.push(id);
        members.set(id, collection);
      } else {
        worldMembers.push({ actor: await fromUuid(uuid) });
      }
    }

    for (const [collection, ids] of collections.entries()) {
      if (
        collection instanceof foundry.documents.collections.CompendiumCollection
      ) {
        await collection.getDocuments({ _id__in: ids });
      }
    }

    const actors = Array.from(
      members
        .entries()
        .map(([id, collection]) => {
          if (
            collection instanceof
            foundry.documents.collections.CompendiumCollection
          ) {
            return { actor: collection.get(id) };
          }
        })
        .filter((d) => d.actor),
    );
    return actors.concat(worldMembers);
  }

  async addEncounter(actor) {
    const membersCollection = this.toObject().encounters;
    membersCollection.push(actor.uuid);
    return this.parent.update({ "system.encounters": membersCollection });
  }

  async removeEncounter(actor) {
    const membersCollection = this.toObject().encounters;
    let actorId = actor;
    if (actor instanceof Actor) actorId = actor.uuid;
    membersCollection.findSplice((u) => u == actorId);
    return this.parent.update({ "system.encounters": membersCollection });
  }

  async getKnights() {
    return this.knights.map((a) => ({ actor: a() }));
  }
  async addKnight(actor) {
    console.log(actor.id, actor._id)
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
