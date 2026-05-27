import "./react-native-globals";

import { StyleSheet } from "react-native-unistyles";

const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

const lightTheme = {
  colors: {
    background: "#eef4ef",
    foreground: "#07110d",
    muted: "#52645b",
    surface: "#ffffff",
    surfaceAlt: "#f4f8f5",
    border: "#d8e4dc",
    accent: "#0f8f5f",
    accentSoft: "#dff7e8",
    warning: "#c77a1b",
    warningSoft: "#fff0d9",
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 24,
    xl: 36,
  },
  radius: {
    sm: 10,
    md: 18,
    lg: 28,
    pill: 999,
  },
} as const;

const darkTheme = {
  ...lightTheme,
  colors: {
    background: "#07110d",
    foreground: "#eef4ef",
    muted: "#9fb2a8",
    surface: "#101d17",
    surfaceAlt: "#15241c",
    border: "#274134",
    accent: "#66e3a1",
    accentSoft: "#123b28",
    warning: "#ffbb66",
    warningSoft: "#3f2a10",
  },
} as const;

type AppBreakpoints = typeof breakpoints;
type AppThemes = {
  light: typeof lightTheme;
  dark: typeof darkTheme;
};

declare module "react-native-unistyles" {
  export interface UnistylesBreakpoints extends AppBreakpoints {}
  export interface UnistylesThemes extends AppThemes {}
}

StyleSheet.configure({
  breakpoints,
  themes: {
    light: lightTheme,
    dark: darkTheme,
  },
  settings: {
    initialTheme: "light",
    CSSVars: false,
  },
});
