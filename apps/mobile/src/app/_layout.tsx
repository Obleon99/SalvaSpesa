import "../polyfills";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { Onboarding } from "../onboarding";
import { AppProvider, useApp } from "../state";

// Al primo avvio la guida copre le tab; il navigatore resta montato sotto.
function Shell() {
  const { ready, onboarded } = useApp();
  return (
    <>
      <StatusBar style="dark" />
      <Tabs screenOptions={{ tabBarActiveTintColor: "#15803d", headerTitleStyle: { fontWeight: "700" } }}>
        <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: () => <Text>🏠</Text> }} />
        <Tabs.Screen name="offerte" options={{ title: "Offerte", tabBarIcon: () => <Text>🏷️</Text> }} />
        <Tabs.Screen name="zona" options={{ title: "La mia zona", tabBarIcon: () => <Text>📍</Text> }} />
        <Tabs.Screen name="profilo" options={{ title: "Profilo", tabBarIcon: () => <Text>👤</Text> }} />
      </Tabs>
      {!ready ? <View style={styles.cover} /> : !onboarded ? <View style={styles.cover}><Onboarding /></View> : null}
    </>
  );
}

export default function Layout() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  cover: { ...StyleSheet.absoluteFill, backgroundColor: "#f8fafc" },
});
