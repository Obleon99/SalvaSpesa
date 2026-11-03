import "../polyfills";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { Onboarding } from "../onboarding";
import { AppProvider, useApp } from "../state";
import { colors } from "../theme";

const tabIcon = (emoji: string) =>
  function TabIcon({ focused }: { focused: boolean }) {
    return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>;
  };

// Al primo avvio la guida copre le tab; il navigatore resta montato sotto.
function Shell() {
  const { ready, onboarded } = useApp();
  const insets = useSafeAreaInsets();
  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.muted,
          tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
          // La barra si alza da sola sopra i tasti di navigazione di sistema (insets.bottom).
          tabBarStyle: { height: 56 + insets.bottom, paddingBottom: Math.max(insets.bottom, 6), paddingTop: 6, backgroundColor: colors.card, borderTopColor: colors.line },
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "800" },
        }}
      >
        <Tabs.Screen name="index" options={{ title: "Home", headerShown: false, tabBarIcon: tabIcon("🏠") }} />
        <Tabs.Screen name="offerte" options={{ title: "Offerte", tabBarIcon: tabIcon("🏷️") }} />
        <Tabs.Screen name="zona" options={{ title: "La mia zona", tabBarIcon: tabIcon("📍") }} />
        <Tabs.Screen name="profilo" options={{ title: "Profilo", tabBarIcon: tabIcon("👤") }} />
      </Tabs>
      {!ready ? <View style={styles.cover} /> : !onboarded ? <View style={styles.cover}><Onboarding /></View> : null}
    </>
  );
}

export default function Layout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Shell />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  cover: { ...StyleSheet.absoluteFill, backgroundColor: colors.bg },
});
