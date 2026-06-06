export default class ChaosiumCanvasInterface extends foundry.data.regionBehaviors.RegionBehaviorType {
  static get actionToggles () {
    return {
      [ChaosiumCanvasInterface.actionToggle.On]: 'PEN.ChaosiumCanvasInterface.Actions.Show',
      [ChaosiumCanvasInterface.actionToggle.Off]: 'PEN.ChaosiumCanvasInterface.Actions.Hide',
      [ChaosiumCanvasInterface.actionToggle.Toggle]: 'PEN.ChaosiumCanvasInterface.Actions.Toggle'
    }
  }

  static get actionToggle () {
    return {
      Off: 0,
      On: 1,
      Toggle: 2
    }
  }

  static get triggerButtons () {
    return {
      [ChaosiumCanvasInterface.triggerButton.Left]: 'PEN.ChaosiumCanvasInterface.Buttons.Left',
      [ChaosiumCanvasInterface.triggerButton.Right]: 'PEN.ChaosiumCanvasInterface.Buttons.Right'
    }
  }

  static get triggerButton () {
    return {
      Left: 0,
      Right: 2
    }
  }
}