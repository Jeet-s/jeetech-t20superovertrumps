import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BackHandler, Linking, Platform, Settings, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, Fredoka_600SemiBold, Fredoka_700Bold } from "@expo-google-fonts/fredoka";
import { Nunito_600SemiBold, Nunito_700Bold } from "@expo-google-fonts/nunito";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { HomeScreen, type HomeTarget } from "./screens/HomeScreen";
import { LevelsScreen } from "./screens/LevelsScreen";
import { DuelScreen, type DuelMode } from "./screens/DuelScreen";
import { ShopScreen } from "./screens/ShopScreen";
import { PacksScreen } from "./screens/PacksScreen";
import { AlbumScreen } from "./screens/AlbumScreen";
import { DeckScreen } from "./screens/DeckScreen";
import { DailyScreen } from "./screens/DailyScreen";
import { OnlineScreen } from "./screens/OnlineScreen";
import { PvpScreen } from "./screens/PvpScreen";
import { SeasonScreen } from "./screens/SeasonScreen";
import { SettingsPopup, initAudio } from "./ui";
import { notify } from "./modules/notify";
import { type Match } from "./modules/multiplayer";
import { SPECS } from "./game/specs";
import { ensureMeta } from "./game/meta";
import { analytics } from "./modules/analytics";
import { layout } from "./modules/layout";
import { ads } from "./modules/ads";
import { iap } from "./modules/iap";
import { store } from "./modules/store";
import { ScreenshotScene } from "./screenshots";
import { qa } from "./modules/qa";

// Screenshot mode: <scheme>://shot/<id> on Android; on iOS the factory passes the scene as the launch argument
// -AGFShot <id> (iOS 27 asks "Open in …?" for deep links, which would end up in the store screenshots).
const initialShotUrl = (): Promise<string | null | undefined> => {
  const id = Platform.OS === "ios" ? (Settings.get("AGFShot") as string | undefined) : undefined;
  return id ? Promise.resolve(`agf://shot/${id}`) : Linking.getInitialURL();
};

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Root of the premium runtime. Boot order matters: fonts → player state →
 * audio → consent + ads → billing. The builder adds screens/flows but keeps
 * this shell: providers, fonts, the banner slot and screenshot mode.
 */
export default function App() {
  const [fontsLoaded] = useFonts({ Fredoka_600SemiBold, Fredoka_700Bold, Nunito_600SemiBold, Nunito_700Bold });
  // Screenshot mode (<scheme>://shot/<id>): render a store-screenshot scene
  // without ads or billing. undefined = still checking the launch URL.
  const [shot, setShot] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    initialShotUrl()
      .then((u) => {
        // QA level replay (<scheme>://qa/level/<n>, src/modules/qa.ts): straight into level n.
        const lv = Number(u?.match(/qa\/level\/(\d+)/)?.[1] ?? NaN);
        if (Number.isFinite(lv) && lv > 0) qa.level = lv;
        setShot(u?.match(/shot\/([\w-]+)/)?.[1] ?? null);
      })
      .catch(() => setShot(null));
  }, []);
  const ready = fontsLoaded && shot !== undefined;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  if (!ready) return <View style={styles.root} />;
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        {shot ? <ScreenshotScene id={shot} /> : <Game />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

type Screen =
  | { name: "home" } | { name: Exclude<HomeTarget, "settings"> } | { name: "duel"; mode: DuelMode; n: number }
  | { name: "pvp"; match: Match };

function Game() {
  const [booted, setBooted] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [screen, setScreen] = useState<Screen>(
    qa.level ? { name: "duel", mode: { kind: "ladder", n: Math.min(SPECS.length, qa.level) }, n: 0 } : { name: "home" },
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const duelKey = useRef(0);

  useEffect(() => {
    (async () => {
      await store.load();
      ensureMeta();
      analytics.track("app_open");
      setBooted(true);
      await initAudio();
      if (qa.level) return; // QA replay: no ads, no billing — nothing may cover the board
      // Comeback nudge, re-armed on every launch (fires only if the player stays away).
      void notify.comeback({ days: 2, title: "Your streak is waiting", body: "Today's Daily Chase and a new rival are ready." });
      await ads.init();
      setShowBanner(ads.canShowBanner());
      await iap.init();
    })();
    return store.subscribe(() => setShowBanner(ads.canShowBanner()));
  }, []);
  useEffect(() => {
    if (!showBanner) layout.setBannerHeight(0);
  }, [showBanner]);

  // Android back: step back to the previous screen (a duel goes back to where it was started); only Home exits.
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (settingsOpen) { setSettingsOpen(false); return true; }
      if (screen.name === "home") return false;
      if (screen.name === "duel") setScreen(screen.mode.kind === "ladder" ? { name: "levels" } : screen.mode.kind === "daily" ? { name: "daily" } : { name: "home" });
      else if (screen.name === "pvp") setScreen({ name: "online" });
      else setScreen({ name: "home" });
      return true;
    });
    return () => sub.remove();
  }, [screen, settingsOpen]);

  const home = () => setScreen({ name: "home" });
  const duel = (mode: DuelMode) => { duelKey.current += 1; setScreen({ name: "duel", mode, n: duelKey.current }); };
  const open = (t: HomeTarget) => (t === "settings" ? setSettingsOpen(true) : setScreen({ name: t }));
  const quick = (online: boolean, oppName?: string) => duel({ kind: "quick", seed: (Date.now() & 0xffffff) | 1, online, oppName });

  if (!booted) return <View style={styles.root} />;
  const id = screen.name === "duel" ? `duel-${screen.n}` : screen.name;
  return (
    <View style={styles.root}>
      <ScreenFade id={id}>
        {screen.name === "home" ? (
          <HomeScreen onPlay={(n) => duel({ kind: "ladder", n })} onOpen={open} />
        ) : screen.name === "levels" ? (
          <LevelsScreen onPlay={(n) => duel({ kind: "ladder", n })} onBack={home} />
        ) : screen.name === "duel" ? (
          <DuelScreen
            key={screen.n}
            mode={screen.mode}
            onExit={() => setScreen(screen.mode.kind === "ladder" ? { name: "levels" } : screen.mode.kind === "daily" ? { name: "daily" } : screen.mode.online ? { name: "online" } : { name: "home" })}
            onSettings={() => setSettingsOpen(true)}
            onNext={duel}
          />
        ) : screen.name === "shop" ? (
          <ShopScreen onBack={home} />
        ) : screen.name === "packs" ? (
          <PacksScreen onBack={home} />
        ) : screen.name === "album" ? (
          <AlbumScreen onBack={home} />
        ) : screen.name === "deck" ? (
          <DeckScreen onBack={home} onPlay={() => quick(false)} />
        ) : screen.name === "daily" ? (
          <DailyScreen onBack={home} onPlayChase={(dateKey) => duel({ kind: "daily", dateKey })} />
        ) : screen.name === "online" ? (
          <OnlineScreen onBack={home} onBot={(name) => quick(true, name)} onPvp={(match) => setScreen({ name: "pvp", match })} />
        ) : screen.name === "season" ? (
          <SeasonScreen onBack={home} onOpenPacks={() => setScreen({ name: "packs" })} />
        ) : screen.name === "pvp" ? (
          <PvpScreen key={screen.match.id} match={screen.match} onExit={() => setScreen({ name: "online" })} onVsAi={() => quick(true, "AI Rival")} />
        ) : null}
      </ScreenFade>
      <SettingsPopup visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
      {showBanner && screen.name !== "pvp" && (
        // The banner sits ABOVE the gesture pill / home indicator (edge-to-edge draws the app under them — "banner ad
        // covered by the gesture bar", layout_small 2026-10-23); its measured height includes that inset, so
        // useBottomInset() clears both.
        <View style={[styles.banner, { paddingBottom: insets.bottom }]} onLayout={(e) => layout.setBannerHeight(e.nativeEvent.layout.height)}>
          <BannerAd unitId={ads.bannerUnitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
        </View>
      )}
    </View>
  );
}

/**
 * Screen change: the new screen eases in from 35 % opacity — a stable container, never a keyed `entering` /
 * `exiting` layout animation and never a fade from 0. Why (2026-10-20..27): keyed entering containers stuck blank on
 * Android ("blank screen after Play"), and their transform skewed every measureInWindow taken while they ran (QA
 * replay touches landed off the board). Opacity only: positions are final from the first frame.
 */
function ScreenFade({ id, children }: { id: string; children: React.ReactNode }) {
  const o = useSharedValue(1);
  const [first] = useState(() => ({ id }));
  useLayoutEffect(() => {
    if (first.id === id) return; // the launch screen just appears
    first.id = "";
    o.value = 0.35;
    o.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) });
  }, [id, o, first]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[styles.root, st]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A1A3A" },
  banner: { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center" },
});
