import { Platform, type ViewStyle } from "react-native";

export const colors = {
  primary: "#1d5fd1",
  primaryDark: "#1747a3",
  primarySoft: "#dbeafe",
  accent: "#f97316",
  danger: "#dc2626",
  bg: "#eef5fd",
  card: "#f7fbff",
  text: "#0f172a",
  muted: "#64748b",
  line: "#dbe6f3",
};

export const radius = { sm: 10, md: 16, lg: 22, pill: 999 };

// Ombra leggera: su Android basta `elevation`, sul resto una piccola ombra sfumata.
export const shadow: ViewStyle =
  Platform.OS === "android"
    ? { elevation: 2 }
    : { shadowColor: "#0f172a", shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } };

// Insegne senza logo ufficiale a risoluzione sufficiente: badge con il nome sul colore di marca.
export const BRAND_BADGES: Record<string, { color: string; text: string; label: string }> = {
  tigros: { color: "#d4141c", text: "#ffffff", label: "tigros" },
  ekom: { color: "#ffd100", text: "#1b1b1b", label: "ekom" },
  basko: { color: "#d9261c", text: "#ffffff", label: "basko" },
  iper: { color: "#e4002b", text: "#ffffff", label: "iper" },
  tosano: { color: "#005baa", text: "#ffffff", label: "tosano" },
  ins: { color: "#0072bc", text: "#ffffff", label: "iN's" },
  dok: { color: "#e30613", text: "#ffffff", label: "dok" },
  sigma: { color: "#00833e", text: "#ffffff", label: "sigma" },
};
