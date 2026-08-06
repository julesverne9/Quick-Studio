import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LandingScreen from "../screens/LandingScreen";
import HomeScreen from "../screens/HomeScreen";
import Workspace from "../screens/Workspace";
import VideoEditorScreen from "../video-editor/VideoEditorScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Landing"
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Editor" component={Workspace} />
      <Stack.Screen name="VideoEditor" component={VideoEditorScreen} />
    </Stack.Navigator>
  );
}
