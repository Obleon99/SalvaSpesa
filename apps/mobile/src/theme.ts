import { Platform, type ViewStyle } from "react-native";

export const colors = {
  primary: "#15803d",
  primaryDark: "#0f5f2e",
  primarySoft: "#dcfce7",
  accent: "#f97316",
  danger: "#dc2626",
  bg: "#f4f7f5",
  card: "#ffffff",
  text: "#0f172a",
  muted: "#64748b",
  line: "#e5eae7",
};

export const radius = { sm: 10, md: 16, lg: 22, pill: 999 };

// Ombra leggera: su Android basta `elevation`, sul resto una piccola ombra sfumata.
export const shadow: ViewStyle =
  Platform.OS === "android"
    ? { elevation: 2 }
    : { shadowColor: "#0f172a", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } };

// Colore di riconoscimento di ogni insegna, usato nelle etichette dei prodotti.
export const CHAIN_COLORS: Record<string, string> = {
  Lidl: "#0050aa",
  Penny: "#cd1719",
  Eurospin: "#e30613",
  Esselunga: "#d71920",
  Tigros: "#e2001a",
  Ekom: "#f59e0b",
  Aldi: "#00549f",
  Conad: "#e30613",
  Coop: "#e2001a",
};
export const chainColor = (name: string) => CHAIN_COLORS[name] ?? colors.primary;
