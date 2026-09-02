export class PENActorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {}
  }  

  //Calculate Defensive values
  _calcDV() {
    this.parent.dvLabel = "";
    this.parent.dvLabelHint = "";
    let citywallsLabel = "";
    let outworksLabel = "";
    let outerbaileyLabel = "";
    let innerbaileyLabel = "";
    let motteLabel = "";
    let strongholdLabel = "";
    let tempLabel = "";
    let tempLabelHint = "";

    let activeManorImp = this.parent.items
      .filter((i) => i.type === "manorImp")
      .filter((i) => ["maintained", "unmaintained"].includes(i.system.status));      
    //Calculate Defense Value
    for (let [key, dv] of Object.entries(this.parent.system.dv)) {
      dv.label = game.i18n.localize(`PEN.dv.${key}`);
      dv.value = activeManorImp
        .filter((i) => i.system.dv.value != 0 && i.system.dv.pos === key)
        .map((i) => i.system.dv.value)
        .reduce((total, current) => total + current, 0);
      if (['motte1','motte2','motte3'].includes(key)) {
        let motte = activeManorImp        
          .filter((i) => i.system.dv.value != 0 && i.system.dv.pos === key)
          .filter((i) => i.flags?.Pendragon?.pidFlag?.id === 'i.manorImp.motte')
        if (motte.length <1) {dv.singlemotte = false} 
      }  
    }
    //If Motte 1,2 or 3 have scores above 0 and are only single mottes then add the relevant stronghold score
    if (this.parent.system.dv.motte1.value > 0 && this.parent.system.dv.motte1.singlemotte) {
      this.parent.system.dv.motte1.value = this.parent.system.dv.motte1.value + this.parent.system.dv.stronghold1.value
    }  
    if (this.parent.system.dv.motte2.value > 0 && this.parent.system.dv.motte2.singlemotte) {
      this.parent.system.dv.motte2.value = this.parent.system.dv.motte2.value + this.parent.system.dv.stronghold2.value 
    }
    if (this.parent.system.dv.motte3.value > 0 && this.parent.system.dv.motte3.singlemotte) {
      this.parent.system.dv.motte3.value = this.parent.system.dv.motte3.value + this.parent.system.dv.stronghold3.value     
    }  

    for (let [key, dv] of Object.entries(this.parent.system.dv)) {
      if (dv.value != 0) {
        let tempCase = key.slice(0,-1)
        switch (tempCase) {
          case "citywall":
            citywallsLabel = dv.value;
            break;
          case "outwork": 
            outworksLabel = dv.value;
            break;
          case "outerbailey":
            outerbaileyLabel = outerbaileyLabel + dv.value + "-"
            break;
          case "innerbailey":
            innerbaileyLabel = innerbaileyLabel + dv.value + "-"
            break; 
          case "motte":
            motteLabel = motteLabel + dv.value + "-"
            break;   
          case "stronghold":
            strongholdLabel = strongholdLabel + dv.value + "-"
            break;                                               
        }
      }
    }

    if (citywallsLabel != "") { 
      tempLabel = tempLabel + citywallsLabel + "/"
      tempLabelHint = tempLabelHint + "<p>" + game.i18n.localize('PEN.dv.citywalls') + ": " + citywallsLabel + "</p>"
    }  
    if (outworksLabel !="") { 
      tempLabel = tempLabel + outworksLabel + "/"
      tempLabelHint = tempLabelHint + "<p>" + game.i18n.localize('PEN.dv.outworks') + ": " + outworksLabel + "</p>"
    } 
    if (outerbaileyLabel.length > 0) { 
      tempLabel = tempLabel + outerbaileyLabel.slice(0,-1) + "/"
      tempLabelHint = tempLabelHint + "<p>" + game.i18n.localize('PEN.dv.outerbailey') + ": " + outerbaileyLabel.slice(0,-1) + "</p>"
    } 
    if (innerbaileyLabel.length > 0) { 
      tempLabel = tempLabel + innerbaileyLabel.slice(0,-1) + "/"
      tempLabelHint = tempLabelHint + "<p>" + game.i18n.localize('PEN.dv.innerbailey') + ": " + innerbaileyLabel.slice(0,-1) + "</p>"
    }
    if (motteLabel.length > 0) { 
      tempLabel = tempLabel + motteLabel.slice(0,-1) + "/"
      tempLabelHint = tempLabelHint + "<p>" + game.i18n.localize('PEN.dv.motte') + ": " + motteLabel.slice(0,-1) + "</p>"
    }
      if (strongholdLabel.length > 0) { 
      tempLabel = tempLabel + strongholdLabel.slice(0,-1) + "/"
      tempLabelHint = tempLabelHint + "<p>" + game.i18n.localize('PEN.dv.stronghold') + ": " + strongholdLabel.slice(0,-1) + "</p>"
    }

    this.parent.dvLabel = tempLabel.slice(0, -1);
    this.parent.dvLabelHint = tempLabelHint;      

    if (this.parent.dvLabel === "") {
      this.parent.dvLabel = 0;
      this.parent.dvLabelHint = game.i18n.localize('PEN.none');            
    }  
    return  
  }    

  //Calculate Folk Costs
  _calcFolkCost() {
    //Calculate Skill Totals
    for (let i of this.parent.items) {
      if (i.type === "skill") {
        i.system.total =
          Number(i.system.value) +
          Number(i.system.culture) +
          Number(i.system.family) +
          Number(i.system.create) +
          Number(i.system.winter);
      }      
    }
    //Calculate Skill Cost
    let backList = this.parent.items.filter((i)=> i.type==='background')
    let skillList = this.parent.items
      .filter((i)=> i.type==='skill')
      .filter((i)=> i.system.npcSource !='')      
    for (let backNPC of backList) {
      //Skill Cost is based on the highest skill associated with the background npc
      let theseSkills = skillList.filter((i) =>i.system.npcSource === backNPC.uuid).map((s)=> { return { name: s.name, total: s.system.total} });
      let maxSkill = Math.max(...theseSkills.map((s)=>s.total))
      backNPC.system.skillCost.libra = Math.max(0,maxSkill-15) + Math.max(0,maxSkill-19)
      //Calculate Total Cost  
      let totalCost = (backNPC.system.annualCost.libra * 240) 
        + (backNPC.system.skillCost.libra * 240) 
        + backNPC.system.annualCost.denarii 
        + backNPC.system.skillCost.denarii;   
      backNPC.system.totalCost.libra = Math.floor(totalCost/240);
      backNPC.system.totalCost.denarii = totalCost % 240;      
    }
    //Calculate Total Folk Cost
    let folkCost = 0;
    let manorFolk = this.parent.items
      .filter((i) => i.type === "background");    
    for (let folk of manorFolk) {
      folkCost = folkCost + folk.system.totalCost.libra * 240 + folk.system.totalCost.denarii;
    }
    //For Barony folk Cost rounds to nearest libra
    if (this.parent.type === 'barony') {
      this.parent.system.folkCost.libra = Math.round(folkCost / 240);
      this.parent.system.folkCost.denarii = 0;      
    } else if (this.parent.type === 'manor') {
      this.parent.system.folkCost.libra = Math.floor(folkCost / 240);
      this.parent.system.folkCost.denarii = folkCost % 240;        
    }
    return
  } 
  
  //Calculate Stewardship Score
  _getStewardship() {
    //Get Stewardship score of estate manager
    let stewardship = 0
    if (this.parent.system.enfeoffed.npc) {
      let tempActor = fromUuidSync(this.parent.system.enfeoffed.npc)
      if (tempActor) {
        let tempSkill = tempActor.items.filter((i)=> i.flags?.Pendragon?.pidFlag?.id === 'i.skill.stewardship')[0]
        if (tempSkill) {
          stewardship =
            Number(tempSkill.system.value) +
            Number(tempSkill.system.culture) +
            Number(tempSkill.system.family) +
            Number(tempSkill.system.create) +
            Number(tempSkill.system.winter);
        }
      }
    } else if (this.parent.system.enfeoffed.background !="none") {
      let backgroundNPC = this.parent.items.get(this.parent.system.enfeoffed.background).uuid
      if (backgroundNPC) {
        let tempSkill = this.parent.items
        .filter((i)=> i.system.npcSource === backgroundNPC)
        .filter((i)=> i.flags?.Pendragon?.pidFlag?.id === 'i.skill.stewardship')[0]
        if (tempSkill) {
          stewardship =
            Number(tempSkill.system.value) +
            Number(tempSkill.system.culture) +
            Number(tempSkill.system.family) +
            Number(tempSkill.system.create) +
            Number(tempSkill.system.winter);
        }
      }
    }
    this.parent.system.enfeoffed.stewardship = stewardship    
  }
}