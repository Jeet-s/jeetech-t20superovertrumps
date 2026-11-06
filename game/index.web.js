import { LoadSkiaWeb } from "@shopify/react-native-skia/lib/module/web";
LoadSkiaWeb({ locateFile: (f) => "/" + f }).then(() => { require("./index.js"); });
