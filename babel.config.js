module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
    ],
    plugins: [
      // NativeWind requires this plugin for Tailwind class compilation
      "nativewind/babel",
      // Reanimated must be last. In Reanimated v4+, worklets are built-in.
      // Do NOT include react-native-worklets/plugin separately — it conflicts.
      "react-native-reanimated/plugin",
    ],
  };
};
