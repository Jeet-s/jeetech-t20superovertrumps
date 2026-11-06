/** Game art (assets/art/manifest.json: kind/usage/size; "legacy" ids are the previous art). Use with expo Image or Skia useImage. */
export const art = {
  bg_stadium_dusk: require("../assets/art/bg_stadium_dusk.png"),
  bg_gully_golden: require("../assets/art/bg_gully_golden.png"),
  bg_trophy_night: require("../assets/art/bg_trophy_night.png"),
  card_face_frame: require("../assets/art/card_face_frame.png"),
  card_back: require("../assets/art/card_back.png"),
  rarity_foil_overlay: require("../assets/art/rarity_foil_overlay.png"),
  pitch_table_board: require("../assets/art/pitch_table_board.png"),
  hud_scoreboard_plate: require("../assets/art/hud_scoreboard_plate.png"),
  ball_pip_set: require("../assets/art/ball_pip_set.png"),
  btn_primary_red: require("../assets/art/btn_primary_red.png"),
  btn_secondary_blue: require("../assets/art/btn_secondary_blue.png"),
  icon_power_cards: require("../assets/art/icon_power_cards.png"),
  icon_rewards: require("../assets/art/icon_rewards.png"),
  fx_aggressive_flame: require("../assets/art/fx_aggressive_flame.png"),
  fx_safe_shield: require("../assets/art/fx_safe_shield.png"),
  hero_ballie_key_art: require("../assets/art/hero_ballie_key_art.png"),
  logo: require("../assets/art/logo.png"),
} as const;
export type ArtId = keyof typeof art;
