# Frontend — Running and Building the App

The frontend is a React Native app built with Expo (Expo SDK 54, React Native 0.81).

## Important: this app cannot run in Expo Go or a web browser

The app depends on native modules that require real device hardware (camera, media libraries, gesture/animation libraries requiring native builds). Because of this:
- It will **not** run via Expo Go.
- It will **not** run in a web browser via `expo start --web`.
- `assembleDebug` does not currently produce a usable build either.

**The only reliable way to build and test this app is a release build of the native Android project.**

## Prerequisites
- Node.js (a recent LTS version)
- npm
- Android Studio, with the Android SDK installed
- A physical Android device (or emulator) to install and test the built APK

## Setup

```bash
cd frontend
npm install
```

If native config has drifted from the Expo config (e.g. after adding a new native dependency), regenerate the native project:

```bash
npx expo prebuild
```

## Building a release APK

```bash
cd frontend/android
./gradlew assembleRelease
```

The resulting APK will be at:
```
frontend/android/app/build/outputs/apk/release/app-release.apk
```

Install it on a connected device via `adb install` or by transferring the file directly.

## Environment configuration

The app needs to know the backend's base URL. Check for an environment file or config constant (search for where the API base URL is defined in the client code) and confirm it points to the correct deployed backend URL (see `BACKEND.md`) before building a release APK for handover or demo purposes.

## Notes for whoever picks this up next
- If you add a new native dependency (anything requiring native code, not pure JS), you will likely need to run `npx expo prebuild` again and do a fresh `assembleRelease` — a Metro/JS-only reload is not sufficient for native changes.
- If a build fails with a missing Babel plugin or module error immediately after installing a new library (e.g. `react-native-reanimated/plugin`), check that the library itself is actually listed as an installed dependency in `package.json` — it's a common mistake to add Babel/config references before the actual package is installed.