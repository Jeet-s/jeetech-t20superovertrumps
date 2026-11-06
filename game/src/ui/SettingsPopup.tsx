import { useEffect, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { Popup } from "./Popup";
import { Toggle } from "./Toggle";
import { GameButton } from "./GameButton";
import { Note } from "./Note";
import { restoreWithNote } from "./purchases";
import { feedback } from "../audio/sfx";
import { store } from "../modules/store";
import { share } from "../modules/share";
import { notify } from "../modules/notify";
import { analytics } from "../modules/analytics";
import { meta, playerLevel, setMeta, totalStars } from "../game/meta";
import { STATS_AS_OF } from "../game/cards";
import { fonts, palette } from "./theme";

export const PRIVACY_URL = "https://app-cloud-api-production.up.railway.app/cloud/legal/g-com.jeetech.t20superovertrumps/";

/** Settings: sound, music, haptics, colour-blind and reduced-motion modes, reminders, share, restore, privacy. */
export function SettingsPopup({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [s, setS] = useState(store.get());
  useEffect(() => store.subscribe(setS), []);
  const [note, setNote] = useState<{ text: string; id: number; good: boolean } | null>(null);
  const [restoring, setRestoring] = useState(false);
  useEffect(() => { if (!visible) setNote(null); }, [visible]);
  async function restore() {
    if (restoring) return;
    setRestoring(true);
    setNote({ text: "Checking your purchases…", id: Date.now(), good: false });
    const text = await restoreWithNote();
    const good = !!store.get().adsRemoved;
    feedback(good ? "success" : "pop", good ? "success" : "light");
    setNote({ text, id: Date.now(), good });
    setRestoring(false);
  }
  const m = meta();
  const lv = playerLevel(m.xp);
  const set = (k: string, v: boolean, patch: () => void) => { patch(); analytics.track("settings_changed", { setting: k, on: v }); };
  return (
    <Popup visible={visible} title="Settings" onClose={onClose}>
      <View style={styles.profile}>
        <Text style={styles.pTitle}>Player level {lv.level}</Text>
        <Text style={styles.pSub}>{m.wins} wins · {m.duels} duels · {totalStars()} stars · {Object.keys(m.cards).length} cards</Text>
      </View>
      <Toggle label="Sound" value={s.sound !== false} onChange={(v) => set("sound", v, () => store.set({ sound: v }))} />
      <Toggle label="Music" value={s.music !== false} onChange={(v) => set("music", v, () => store.set({ music: v }))} />
      <Toggle label="Vibration" value={s.haptics !== false} onChange={(v) => set("haptics", v, () => store.set({ haptics: v }))} />
      <Toggle label="Colour-blind mode" value={m.colorBlind} onChange={(v) => set("color_blind", v, () => setMeta({ colorBlind: v }))} />
      <Toggle label="Reduced motion" value={m.reducedMotion} onChange={(v) => set("reduced_motion", v, () => setMeta({ reducedMotion: v }))} />
      <Toggle label="Daily reminders" value={m.reminders} onChange={(v) => set("reminders", v, () => {
        if (v) void notify.ask("Daily Chase reminder").then((ok) => {
          setMeta({ reminders: ok });
          if (ok) void notify.daily("daily-chase", { hour: 18, minute: 30 }, { title: "Today's Daily Chase is live", body: "A new hand, a new target — can you top the board?" });
        });
        else { setMeta({ reminders: false }); void notify.cancel("daily-chase"); }
      })} />
      {/* Share the game (src/modules/share.ts) — factory-owned, keep it (owner, 2026-10-25). */}
      <GameButton style={{ marginTop: 14 }} size="sm" variant="secondary" label="Share with friends" onPress={() => void share.app("settings")} />
      <GameButton style={{ marginTop: 10 }} size="sm" variant="light" label={restoring ? "Restoring…" : "Restore purchases"} onPress={() => void restore()} />
      {note ? <View style={{ marginTop: 8 }}><Note text={note.text} id={note.id} tone={note.good ? "good" : "info"} /></View> : null}
      <Text style={styles.link} onPress={() => Linking.openURL(PRIVACY_URL)}>Privacy policy</Text>
      <Text style={styles.legal}>Card stats are compiled from public international scorecards (as of {STATS_AS_OF}). Player names are deliberately altered and avatars are cartoons. Not affiliated with any league, board or team.</Text>
      <GameButton style={{ marginTop: 12 }} label="Done" variant="accent" onPress={onClose} />
    </Popup>
  );
}

const styles = StyleSheet.create({
  profile: { backgroundColor: "#0B1F4B", borderRadius: 14, padding: 10, marginBottom: 6, borderWidth: 1.5, borderColor: "rgba(245,184,46,0.5)" },
  pTitle: { fontFamily: fonts.display, fontSize: 17, color: palette.goldLight },
  pSub: { fontFamily: fonts.bodyRegular, fontSize: 12, color: palette.inkSoft },
  link: { fontFamily: fonts.body, color: palette.goldLight, textAlign: "center", marginTop: 12, textDecorationLine: "underline", paddingVertical: 6 },
  legal: { fontFamily: fonts.bodyRegular, fontSize: 11, color: palette.inkSoft, textAlign: "center", marginTop: 4 },
});
