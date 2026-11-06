const Null = () => null;
const handler = {
  get(t, p) {
    if (p === "then") return undefined;
    if (p === "__esModule") return true;
    if (p === "BannerAd" || p === "default" || p === "GAMBannerAd" || p === "NativeAdView") return Null;
    if (p === Symbol.toPrimitive) return () => "";
    if (p === "toString") return () => "";
    return proxy;
  },
  apply() { return proxy; },
  construct() { return proxy; },
};
const proxy = new Proxy(function () {}, handler);
module.exports = proxy;
