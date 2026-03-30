# TabTracker (v1.7.1 - Iteration 4)

TabTracker is an Expo (SDK 54+) app using Expo Router + NativeWind. It stores customer/tab data locally via SQLite.
Current status: Phase 1 (Core Tab Tracking) - Iteration 4 (Final Polish & Launch).

## New machine quick start
### Prerequisites
- Install Node.js (includes `npm`)
- Recommended: ensure `npx` can run Expo CLI (`npx expo ...` is used below)
- For local Android development builds, install JDK 17
- If you want Android emulator/device:
  - Install Android Studio + Android SDK
  - Ensure `adb` is available in your `PATH`
  - Set `ANDROID_HOME` / `ANDROID_SDK_ROOT` to your SDK folder if needed
  - Ensure project `android/local.properties` points to your SDK:
    - `sdk.dir=C\:\\Users\\<you>\\AppData\\Local\\Android\\Sdk`

### Install
```bash
npm install
```

### Run
Generic Metro start (choose a target from prompt):
```bash
npx expo start
```

Web:
```bash
npx expo start --web
```

Expo Go (recommended for JS-only iteration):
```bash
npx expo start --go --lan
```

Android development build (required for native modules in dev binary):
```bash
npx expo run:android
npx expo start --dev-client
```

Helpful flags:
- Clear Metro cache: `npx expo start --clear`
- If port `8081` is busy: `npx expo start --port 8082`

## Troubleshooting
- If Android fails with SDK/`adb` errors:
  - Install Android SDK/Platform Tools in Android Studio
  - Set `ANDROID_HOME` / `ANDROID_SDK_ROOT`
  - Ensure `platform-tools` (where `adb` lives) is on `PATH`
- If you see `No development build ... installed`:
  - You are launching dev-client mode without an installed dev build
  - Use Expo Go mode: `npx expo start --go --lan`
  - Or install a dev build first: `npx expo run:android`
- If you see `RNCDatePicker could not be found`:
  - Rebuild/install Android dev build: `npx expo run:android`
  - Then start with `npx expo start --dev-client`
- If you see unexpected Metro/Babel bundling errors:
  - rerun with `--clear` (this often fixes it)

## Useful dev commands
- Lint: `npm run lint`
- Typecheck: `npx tsc -p tsconfig.json --noEmit`

## App routes
- Dashboard: `/(tabs)/index`
- Add/Edit customer modal: `/modal`
