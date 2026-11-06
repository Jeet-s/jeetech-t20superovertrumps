/**
 * Design tokens. Every screen uses these — never raw colours, sizes or system
 * fonts. The builder re-skins a game by editing `palette` (from the art bible),
 * not by hard-coding styles in components.
 */
export const palette = {
  // Brand (docs/ART_DIRECTION.md UI kit tokens: stadium-night navy, ball red, trophy gold)
  primary: "#C8102E",
  primaryDark: "#8E0A20",
  secondary: "#2E8BFF",
  secondaryDark: "#1654B8",
  accent: "#F5B82E",
  accentDark: "#B87A0A",
  danger: "#E63946",
  dangerDark: "#A61E2A",
  // Surfaces
  bgTop: "#12306E",
  bgBottom: "#0A1A12",
  surface: "#14295C",
  surfaceAlt: "#1C3672",
  surfaceDark: "#0B1F4B",
  ink: "#0B1F4B",
  inkSoft: "#9FB2DA",
  cream: "#FFF4D6",
  gold: "#F5B82E",
  goldLight: "#FFE08A",
  onPrimary: "#FFFFFF",
  // Game feedback
  star: "#FFD24A",
  coin: "#F5B82E",
  success: "#1F9D55",
  win: "#2BC46B",
  lose: "#E0422F",
  aggressive: "#FF5A1F",
  safe: "#2E8BFF",
};

export const fonts = {
  display: "Fredoka_700Bold",
  displayMedium: "Fredoka_600SemiBold",
  body: "Nunito_700Bold",
  bodyRegular: "Nunito_600SemiBold",
};

export const radius = { sm: 12, md: 18, lg: 26, xl: 36, pill: 999 };
export const space = { xs: 4, sm: 8, md: 14, lg: 20, xl: 28, xxl: 40 };

export const type = {
  hero: { fontFamily: fonts.display, fontSize: 44, letterSpacing: 0.5 },
  title: { fontFamily: fonts.display, fontSize: 30 },
  heading: { fontFamily: fonts.displayMedium, fontSize: 22 },
  body: { fontFamily: fonts.body, fontSize: 16 },
  caption: { fontFamily: fonts.bodyRegular, fontSize: 13 },
  button: { fontFamily: fonts.display, fontSize: 20, letterSpacing: 0.6 },
};

/** Soft drop shadow used on cards and buttons (iOS + Android). */
export const shadow = {
  shadowColor: "#020814",
  shadowOpacity: 0.35,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 8 },
  elevation: 10,
};

/** Spring presets — use these so every animation in the game feels consistent. */
export const springs = {
  press: { damping: 14, stiffness: 320, mass: 0.6 },
  pop: { damping: 9, stiffness: 220, mass: 0.7 },
  gentle: { damping: 18, stiffness: 140, mass: 1 },
};
