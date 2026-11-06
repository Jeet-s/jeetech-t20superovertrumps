/** Single sprites baked from the art sheets in assets/art (scripts/dev/bake-ui.py → assets/ui). */
export const sprites = {
  ball: require("../assets/ui/ball.png"),
  coin: require("../assets/ui/icon_coin.png"),
  gem: require("../assets/ui/icon_gem.png"),
  star: require("../assets/ui/icon_star.png"),
  pack: require("../assets/ui/icon_pack.png"),
  trophy: require("../assets/ui/icon_trophy.png"),
  pipWon: require("../assets/ui/pip_won.png"),
  pipLost: require("../assets/ui/pip_lost.png"),
  pipTie: require("../assets/ui/pip_tie.png"),
  pipPending: require("../assets/ui/pip_pending.png"),
  pwEmpty: require("../assets/ui/pw_empty.png"),
  pwFreeHit: require("../assets/ui/pw_freehit.png"),
  pwReview: require("../assets/ui/pw_review.png"),
} as const;
export type SpriteId = keyof typeof sprites;
