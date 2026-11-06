import { useState } from "react";
import { HomeScreen } from "./screens/HomeScreen";
import { LevelsScreen } from "./screens/LevelsScreen";
import { DuelScreen } from "./screens/DuelScreen";
import { PacksScreen } from "./screens/PacksScreen";
import { store } from "./modules/store";
import { meta } from "./game/meta";
import { PLAYERS } from "./game/cards";

/**
 * Screenshot mode: the factory opens the app with <scheme>://shot/<id> on an emulator and captures the screen for the
 * store listing. Every scene renders a REAL state of the game with the real screens. Ads are off here.
 */
const noop = () => {};

export function ScreenshotScene({ id }: { id: string }) {
  // A player who has made good progress (13 rivals, stars, a growing album, packs to open).
  useState(() => {
    const stars: Record<string, number> = {};
    for (let n = 1; n <= 13; n++) stars[`u${n}`] = n % 4 === 0 ? 2 : 3;
    const m = meta();
    const cards = { ...m.cards };
    PLAYERS.slice(0, 46).forEach((p, i) => (cards[p.id] = { n: 1 + (i % 3), fp: (i % 3) * 10 }));
    store.set({
      level: 14, coins: 1840, stars, tutorialDone: true,
      meta: { ...m, cards, packs: { gully: 2, club: 1, pro: 1, legend: 1 }, xp: 1450, wins: 19, duels: 24, login: { last: null, day: 4 } },
    });
    return true;
  });
  // Extra review scenes: duel-<n> opens ladder rival n on its first decision.
  const dn = /^duel-(\d+)$/.exec(id);
  if (dn) return <DuelScreen mode={{ kind: "ladder", n: Number(dn[1]) }} onExit={noop} onSettings={noop} onNext={noop} demo={{ steps: 0, autoPick: true }} />;
  const en = /^end-(\d+)$/.exec(id);
  if (en) return <DuelScreen mode={{ kind: "ladder", n: Number(en[1]) }} onExit={noop} onSettings={noop} onNext={noop} demo={{ steps: 500, result: true }} />;
  switch (id) {
    case "home":
      return <HomeScreen onPlay={noop} onOpen={noop} />;
    case "pick":
      return <DuelScreen mode={{ kind: "ladder", n: 12 }} onExit={noop} onSettings={noop} onNext={noop} demo={{ steps: 4, autoPick: true }} />;
    case "aggressive":
      return <DuelScreen mode={{ kind: "ladder", n: 17 }} onExit={noop} onSettings={noop} onNext={noop} demo={{ steps: 4, autoPick: true, stance: "aggressive" }} />;
    case "superover":
      return <DuelScreen mode={{ kind: "ladder", n: 5 }} onExit={noop} onSettings={noop} onNext={noop} demo={{ steps: 0, autoPick: true }} />;
    case "packs":
      return <PacksScreen onBack={noop} demoOpen="legend" />;
    case "ladder":
    default:
      return <LevelsScreen onPlay={noop} onBack={noop} />;
  }
}
