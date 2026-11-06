import { iap } from "../modules/iap";
import { store } from "../modules/store";

export const STORE_UNREACHABLE = "The store isn't reachable right now. Check your connection and try again in a moment.";
export const NO_VIDEO = "No video is ready right now — try again in a moment.";

/**
 * Restore purchases with a visible answer: iap.restore() returns at once when the store isn't connected and can hang
 * on a slow store, so it races a 5 s timeout and never throws. The note says what the player now has.
 */
export async function restoreWithNote(): Promise<string> {
  try {
    await Promise.race([iap.restore(), new Promise<void>((res) => setTimeout(res, 5000))]);
  } catch {
    // fall through: report what the account has now
  }
  return store.get().adsRemoved ? "Purchases restored: ads are off." : "Nothing to restore on this account yet.";
}
