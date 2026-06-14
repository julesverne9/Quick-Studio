import React, { useEffect, useState } from "react";
import { Provider } from "react-redux";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { registerRootComponent } from "expo";

import LandingScreen from "./src/screens/LandingScreen";
import HomeScreen from "./src/screens/HomeScreen";
import Workspace from "./src/screens/Workspace";
import { store } from "./src/store";
import { layout } from "./src/styles/styles";

export default function App() {
  const [activeScreen, setActiveScreen] = useState("landing");

  return (
    <Provider store={store}>
      <View style={layout.safeContainer}>
        <StatusBar style="light" />

        {activeScreen === "landing" && (
          <LandingScreen
            onGetStarted={() => setActiveScreen("home")}
          />
        )}

        {activeScreen === "home" && (
          <HomeScreen
            onBack={() => setActiveScreen("landing")}
            onNewProject={() => setActiveScreen("workspace")}
          />
        )}

        {activeScreen === "workspace" && (
          <Workspace onBack={() => setActiveScreen("home")} />
        )}
      </View>
    </Provider>
  );
}

registerRootComponent(App);
