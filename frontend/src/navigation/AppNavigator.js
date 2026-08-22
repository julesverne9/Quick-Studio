import React from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuth } from "../context/AuthContext";
import LandingScreen from "../screens/LandingScreen";
import AuthScreen from "../screens/AuthScreen";
import OTPVerificationScreen from "../screens/OTPVerificationScreen";
import HomeScreen from "../screens/HomeScreen";
import AccountScreen from "../screens/AccountScreen";
import Workspace from "../screens/Workspace";
import VideoEditorScreen from "../video-editor/VideoEditorScreen";
import { colors } from "../theme/tokens";

const Stack = createNativeStackNavigator();

/* ── Auth Stack: shown to unauthenticated users ──────────────────── */
function AuthStack() {
  return (
    <Stack.Navigator
      initialRouteName="Landing"
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
      {/* Allow guests to browse Home and Editor without signing in */}
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Editor" component={Workspace} />
      <Stack.Screen name="VideoEditor" component={VideoEditorScreen} />
    </Stack.Navigator>
  );
}

/* ── Main Stack: shown when user has a valid JWT ─────────────────── */
function MainStack() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Account" component={AccountScreen} />
      <Stack.Screen name="Editor" component={Workspace} />
      <Stack.Screen name="VideoEditor" component={VideoEditorScreen} />
    </Stack.Navigator>
  );
}

/* ── Root navigator: picks stack based on auth state ─────────────── */
export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show a loading spinner while checking SecureStore on boot
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // If a valid token exists, skip Landing/Auth entirely → MainStack
  // Otherwise show the Landing → Auth flow → AuthStack
  // A keyed navigator remounts on auth transitions, which clears the prior
  // stack history instead of leaving Landing/Auth below the main workspace.
  return isAuthenticated ? (
    <MainStack key="authenticated" />
  ) : (
    <AuthStack key="unauthenticated" />
  );
}
