//If a new world then create a default scene
Hooks.on("ready", () => {
  console.log("Adding a default scene");
  const isNewWorld = !(game.actors.size + game.items.size + game.journal.size);
  if (game.scenes.filter((doc) => doc.id !== "NUEDEFAULTSCENE0").length === 0) {
    Scene.create({
      name: "Default",
      active: true,
      height: 1815,
      width: 3000,
      levels: [
        {
          name: "Default",
          background: { src: "systems/Pendragon/assets/knight_pendragon.webp" },
        },
      ],
      foregroundElevation: 20,
      thumb: "systems/Pendragon/assets/knight_pendragon.webp",
      grid: { type: 0 },
      tokenVision: false,
      fog: { exploration: false },
      initial: {
        scale: 0.6,
        x: 2513,
        y: 1390,
      },
    });
  }
});
