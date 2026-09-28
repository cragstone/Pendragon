export default class PENDialog extends foundry.applications.api.DialogV2 {
  static DEFAULT_OPTIONS = {
    classes: ["Pendragon", "item", "themed", "theme-light"],
    position: {
      width: 400,
      height: "auto",
      top: 200,
      left: 1200,
      zIndex: 500,
    },
  };
}
