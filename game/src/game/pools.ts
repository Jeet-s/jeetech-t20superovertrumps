/**
 * Deck themes: a deck is described as slots of tags ("2 pacers, 2 openers, 2 legends with a Test record"), so the
 * tuner (scripts/tune-units.ts) can pick the exact six cards that hit a unit's target difficulty while the deck still
 * means what its intent says.
 */
import { cardPower, PLAYERS, type Format, type Player } from "./cards";

export type Tag =
  | "bat" | "bowl" | "ar" | "wk" | "opener" | "anchor" | "finisher" | "keeper" | "pacer" | "spinner" | "allrounder"
  | "legend" | "modern" | "test" | "noTest" | "odi" | "bowls" | "noBowl" | "hitter" | "slow" | "tight" | "leaky"
  | "bigHitter" | "midHitter" | "miser" | "goodAvg" | "partTimer" | "strikeBowler" | "soft"
  | "testBat" | "testBowler" | "odiBat" | "odiBowler"
  | "IND" | "PAK" | "AUS" | "ENG" | "SA" | "NZ" | "SL" | "BAN" | "WI" | "AFG";

export interface Slot { n: number; tags: Tag[]; power?: [number, number]; format?: Format }

export function hasTag(p: Player, t: Tag): boolean {
  const l = p.t20i;
  switch (t) {
    case "bat": return p.role === "BAT" || p.role === "WK";
    case "bowl": return p.role === "BOWL";
    case "ar": return p.role === "AR";
    case "wk": return p.role === "WK";
    case "opener": case "anchor": case "finisher": case "keeper": case "pacer": case "spinner": case "allrounder": return p.style === t;
    case "legend": return p.era === "legend";
    case "modern": return p.era === "modern";
    case "test": return !!p.test && p.test.m >= 10;
    case "noTest": return !p.test;
    case "odi": return !!p.odi && p.odi.m >= 20;
    case "bowls": return !!l && l.econ != null && l.wk >= 10;
    case "noBowl": return !l || l.econ == null || l.wk === 0;
    case "hitter": return !!l && l.sr >= 138; // T20I strike rate 138+
    case "bigHitter": return !!l && l.sr >= 148 && l.runs >= 250;
    case "midHitter": return !!l && l.sr >= 128 && l.sr < 146;
    case "miser": return !!l && l.econ != null && l.econ < 6.7 && l.wk >= 30;
    case "goodAvg": return !!l && (l.avg ?? 0) >= 30;
    case "partTimer": return !!l && p.role !== "BOWL" && l.wk >= 5 && l.wk <= 50;
    case "strikeBowler": return !!l && l.wk >= 80;
    case "soft": return !!l && (l.avg ?? 0) < 24 && l.sr < 128 && (l.econ == null || l.econ >= 7.4) && l.wk < 80;
    case "testBat": return !!p.test && p.test.runs >= 3500;
    case "testBowler": return !!p.test && p.test.wk >= 150;
    case "odiBat": return !!p.odi && p.odi.runs >= 4000;
    case "odiBowler": return !!p.odi && p.odi.wk >= 120;
    case "slow": return !!l && l.sr < 115;
    case "tight": return !!l && l.econ != null && l.wk > 0 && l.econ < 7.2;
    case "leaky": return !!l && l.econ != null && l.wk > 0 && l.econ >= 7.9;
    default: return p.country === t;
  }
}

export function slotPool(s: Slot, exclude: Set<string>): string[] {
  const f = s.format ?? "T20";
  const line = f === "T20" ? "t20i" : f === "ODI" ? "odi" : "test";
  return PLAYERS.filter((p) => !exclude.has(p.id) && s.tags.every((t) => hasTag(p, t)))
    // A card with no career in the over's format is blank — only a "noTest" slot (the blank-line twist) may hold one.
    .filter((p) => !!p[line] || s.tags.includes("noTest"))
    .filter((p) => !s.power || (cardPower(p.id, f) >= s.power[0] && cardPower(p.id, f) <= s.power[1]))
    .map((p) => p.id);
}
