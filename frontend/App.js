import React from "react";
import { Provider } from "react-redux";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { registerRootComponent } from "expo";
import { NavigationContainer } from "@react-navigation/native";

import { AuthProvider } from "./src/context/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { store } from "./src/store";
import { layout } from "./src/styles/styles";

export default function App() {
  return (
    <AuthProvider>
      <Provider store={store}>
        <View style={layout.safeContainer}>
          <StatusBar style="light" />
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </View>
      </Provider>
    </AuthProvider>
  );
}

registerRootComponent(App);
