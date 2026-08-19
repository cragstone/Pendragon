import { ChatCardState, ChatCardTemplate } from "../apps/chat.mjs";
import { PendragonStatusEffects } from "../apps/status-effects.mjs";

export class HealingCard {
  static async announceHealingOutcome(actor, result) {
    const healthResult = HealingCard.selectMessage(actor, result);
    const healthLost = result.deterioration > result.totalHealed ? result.deterioration - result.totalHealed : 0;
    const healthGained = result.deterioration < result.totalHealed ? result.totalHealed - result.deterioration : 0;
    const message = game.i18n.format(`PEN.healthResult.${healthResult}`, {
      name: actor.name,
      health_lost: healthLost,
      health_gained: healthGained,
    });
    const messageData = {
      actionLabel: game.i18n.localize("PEN.healthResult.label"),
      image: actor.img,
      name: actor.name,
      message: message,
    };
    const html = await foundry.applications.handlebars.renderTemplate(ChatCardTemplate.DECLARE, messageData);
    const chatData = {
      user: game.user.id,
      content: html,
      speaker: {
        actor: actor._id,
        alias: actor.name,
      },
    };
    await ChatMessage.create(chatData);
  }

  static selectMessage(actor, result) {
    if (result.died) return "death";
    if (result.deterioration > result.totalHealed) return "deteriorated";
    if (result.becomesHealthy) return "healthy";
    if (result.totalHealed == result.deterioration) return "unchanged";
    const atFullHealth = actor.system.hp.max <= actor.system.hp.value;
    if (atFullHealth) return "recovered";
    return "healed";
  }
}
