# TabTracker

TabTracker is an Expo (SDK 54+) app using Expo Router + NativeWind. It stores customer/tab data locally via SQLite.

## New machine quick start
### Prerequisites
- Install Node.js (includes `npm`)
- Recommended: ensure `npx` can run Expo CLI (`npx expo ...` is used below)
- If you want Android emulator/device:
  - Install Android Studio + Android SDK
  - Ensure `adb` is available in your `PATH`
  - Set `ANDROID_HOME` to your SDK folder if needed

### Install
```bash
npm install
```

### Run
Generic (choose a target from the Expo prompt):
```bash
npx expo start
```

Web:
```bash
npx expo start --web
```

Android:
```bash
npx expo start --android
```

Helpful flags:
- Clear Metro cache: `npx expo start --clear`
- If port `8081` is busy: `npx expo start --port 8082`

## Troubleshooting
- If Android fails with SDK/`adb` errors:
  - Install Android SDK/Platform Tools in Android Studio
  - Set `ANDROID_HOME`
  - Ensure `platform-tools` (where `adb` lives) is on `PATH`
- If you see unexpected Metro/Babel bundling errors:
  - rerun with `--clear` (this often fixes it)

## Useful dev commands
- Lint: `npm run lint`
- Typecheck: `npx tsc -p tsconfig.json --noEmit`

## App routes
- Dashboard: `/(tabs)/index`
- Add/Edit customer modal: `/modal`
