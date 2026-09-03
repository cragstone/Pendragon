const { HTMLField, SchemaField, NumberField, StringField, FilePathField, ArrayField, BooleanField, DataField } =
  foundry.data.fields;

export class HistoryData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true };
    return {
      source: new StringField({ initial: "" }),
      description: new StringField({ required: true, blank: true, initial: "" }),
      GMdescription: new StringField({ required: true, blank: true, initial: "" }),
      year: new NumberField({ ...requiredInteger, initial: 0 }),
      glory: new NumberField({ ...requiredInteger, initial: 0 }),
      favourValue: new NumberField({ ...requiredInteger, initial: 0 }),
      favour: new BooleanField({ initial: false }),
    };
  }

  static _preCleanData(data, options, _state) {
    if (_state.modelSource.name.startsWith(data.description)) {
      data.description = "";
    }
  }
}
