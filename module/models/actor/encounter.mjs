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
    return {
      npcs: new ArrayField(new DocumentUUIDField({ type: "Actor" })),
      shortDesc: new StringField(),
      moraleLoss: new StringField(),
      description: new HTMLField(),
      notes: new HTMLField(),
      moraleMin: new NumberField({ integer: true, default: 0 }),
      numOpp: new NumberField({ integer: true, default: 1 }),
      npcView: new NumberField({ integer: true, default: 99 }),
      opportunity: new BooleanField(),
      lock: new BooleanField(),
      noteView: new BooleanField(),
      used: new BooleanField(),
    };
  }

  static migrateData(source) {
    // we are only storing UUIDs after migration
    if (source.npcs) {
      source.npcs = source.npcs.map((m) => {
        if (foundry.utils.getType(m) !== "Object") return m;
        if (m.uuid) return m.uuid;
        return m;
      });
    }
    return source;
  }

  async getMembers() {
    // Batch compendium lookups when retrieving members.
    const collections = new Map();
    const members = new Map();
    const worldMembers = [];

    for (const uuid of this.npcs) {
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

  async addMember(actor) {
    const membersCollection = this.toObject().npcs;
    membersCollection.push(actor.uuid);
    return this.parent.update({ "system.npcs": membersCollection });
  }

  async removeMember(actor) {
    const membersCollection = this.toObject().npcs;
    let actorId = actor;
    if (actor instanceof Actor) actorId = actor.uuid;
    membersCollection.findSplice((u) => u == actorId);
    return this.parent.update({ "system.npcs": membersCollection });
  }
}
