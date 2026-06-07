import { registerSheets } from "../setup/register-sheets.mjs";
import { PID } from "../pid/pid.mjs";
//import ChaosiumCanvasInterfaceInit from '../apps/chaosium-canvas-interface-init.mjs'
import PENClickableEvents from "../apps/clickable-events.mjs";

export function listen() {
  Hooks.once("init", async () => {
    PID.init();
    registerSheets();
    PENClickableEvents.initSelf();
  });
}
