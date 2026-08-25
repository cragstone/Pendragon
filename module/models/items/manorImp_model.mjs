const { HTMLField, SchemaField, NumberField, StringField, FilePathField, ArrayField, BooleanField, DataField } =
  foundry.data.fields;

export class ManorImpData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const requiredInteger = { required: true, nullable: false, integer: true };
    return {
      subtype: new StringField({ required: true, blank: true, initial: "manImp" }),
      description: new StringField({ required: true, blank: true, initial: "" }),
      GMdescription: new StringField({ required: true, blank: true, initial: "" }),
      cost: new SchemaField({
        //Cost to build
        libra: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
        denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
      }),
      repairCost: new SchemaField({
        //Repair cost
        libra: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
        denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
      }),
      annualCost: new SchemaField({
        //Annual maintenance cost
        libra: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
        denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
      }),
      paid: new SchemaField({
        //Amount paid towards the build cost
        libra: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
        denarii: new NumberField({ ...requiredInteger, min: 0, initial: 0 }),
      }),
      income: new SchemaField({
        //Addition to privy income
        libra: new NumberField({ ...requiredInteger, initial: 0 }),
        denarii: new NumberField({ ...requiredInteger, initial: 0 }),
      }),
      status: new StringField({ required: true, blank: true, initial: "maintained" }),
      dv: new SchemaField({
        value: new NumberField({ ...requiredInteger, initial: 0 }),
        pos: new StringField({ required: true, blank: false, initial: "outworks" }),
      }),
      yearAvailable: new NumberField({ ...requiredInteger, initial: 0 }),
      yearAcquired: new NumberField({ ...requiredInteger, initial: 0 }),
      drawFunds: new BooleanField({ initial: false }),
      starter: new BooleanField({ initial: false }), //Is this an improvement that the manor start with
      annchecks: new ArrayField(new DataField(), { initial: [] }),
      annrolls: new ArrayField(new DataField(), { initial: [] }),
      optchecks: new ArrayField(new DataField(), { initial: [] }),
      optrolls: new ArrayField(new DataField(), { initial: [] }),
    };
  }
}
