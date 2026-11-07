import "../polyfills";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "../icons";
import { OfferSheet } from "../offer-sheet";
import { Onboarding } from "../onboarding";
import { AppProvider, useApp } from "../state";
import { colors } from "../theme";

const tabIcon = (name: IconName) =>
  function TabIcon({ color, focused }: { color: unknown; focused: boolean }) {
    return <Icon name={name} size={23} color={String(color)} strokeWidth={focused ? 2.3 : 1.8} />;
  };

// Al primo avvio la guida copre le tab; il navigatore resta montato sotto.
function Shell() {
  const { ready, onboarded } = useApp();
  const insets = useSafeAreaInsets();
  return (
    <>
      {/* Icone chiare sulla fascia verde; scure mentre la guida (sfondo chiaro) copre lo schermo. */}
      <StatusBar style={!ready || !onboarded ? "dark" : "light"} />
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
        <Tabs.Screen name="index" options={{ title: "Home", headerShown: false, tabBarIcon: tabIcon("home") }} />
        <Tabs.Screen name="offerte" options={{ title: "Offerte", tabBarIcon: tabIcon("tag") }} />
        <Tabs.Screen name="lista" options={{ title: "Lista", tabBarIcon: tabIcon("cart") }} />
        <Tabs.Screen name="zona" options={{ title: "La mia zona", tabBarIcon: tabIcon("pin") }} />
        <Tabs.Screen name="profilo" options={{ title: "Profilo", tabBarIcon: tabIcon("user") }} />
      </Tabs>
      <OfferSheet />
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
