# PPVPicker

**PPVPicker** is a React Native application designed for low‑spec Android devices (e.g., set‑top boxes, Firestick). It streams Pay‑Per‑View (PPV) video content and provides a simple UI for selecting streams and viewing events.

The repository contains two flavor directories:
- `Docker-PPV-Picker-mobile` – standard Android phone/tablet build.
- `Docker-PPV-Picker-Firestick` – optimized for 32‑bit ARMv7 devices with a stripped‑down APK.

Both flavors share the same source code under `PPVPicker/` and differ only in Gradle configuration and Docker build scripts.

---

## Tech Stack

| Category | Mobile Flavor | Firestick Flavor |
|---|---|---|
| **Language** | TypeScript 5.0.4 | TypeScript 5.0.4 |
| **Framework** | React Native 0.74.3 | React Native 0.74.3 |
| **Navigation** | @react-navigation/native & native‑stack | Same |
| **State Management** | zustand | Same |
| **Android Build** | Gradle 8.6, Java 17, NDK 26.1 | Same, but `abiFilters "armeabi-v7a"` and `minSdkVersion 28` |
| **JS Engine** | Hermes (enabled in `android/app/build.gradle`) | Same |
| **Containerisation** | Dockerfile (Ubuntu 22.04, Java 17, Node 20, Android SDK) | Same |
| **Linting** | ESLint (TS/TSX) | Same |
| **Type‑checking** | `tsc --noEmit` (`npm run ts-check`) | Same |
| **Package Manager** | npm (scripts defined in `package.json`) | Same |

---

## Prerequisites

- **Node.js** ≥ 20 (install via nvm, asdf, or your OS package manager)
- **Java Development Kit** ≥ 17 (the Docker image provides this for builds)
- **Android SDK & NDK** (handled by the Docker image; required locally only if you run Gradle directly)
- **Docker** ≥ 20.10 (for the provided container‑based build pipeline)
- **git** (to clone the repository)

No additional environment variables are required for local development; the app reads nothing from the environment at runtime.

---

## Project Structure

```
PPVPicker/                     # Shared source code (TS/TSX) used by both flavors
├── src/
│   ├── api/                 # API client (ppvClient.ts)
│   ├── components/           # UI components (EventCard, EmbedCard, …)
│   ├── navigation/          # React Navigation stack (AppNavigator.tsx)
│   ├── screens/             # Screen components (EventListScreen, StreamSelectionScreen, VideoPlayerScreen)
│   ├── store/               # Zustand store (useAppStore.ts)
│   └── types/               # Type definitions (index.ts)
├── App.tsx                  # Root component mounting navigation
├── package.json             # npm scripts, dependencies, devDependencies
├── tsconfig.json            # TypeScript configuration
└── babel.config.js          # Babel config for React Native

Docker-PPV-Picker-mobile/   # Android phone/tablet flavor
└── PPVPicker/               # Contains the same source tree as above
    ├── android/             # Gradle project (app/build.gradle, …)
    ├── Dockerfile           # Container used to build the APK
    └── build‑apk‑signed.sh  # Helper script to produce a signed release APK

Docker-PPV-Picker-Firestick/ # 32‑bit ARMv7‑only flavor
└── PPVPicker/               # Mirrors the mobile layout with a specialized `build.gradle`
    ├── android/             # Gradle with `abiFilters "armeabi‑v7a"`
    ├── Dockerfile           # Same Docker image, different build target
    └── build‑apk‑signed.sh  # Same signing workflow, produces a smaller APK
```

---

## Getting Started – Mobile

```bash
# 1️⃣ Clone the repo
git clone github.com/Lunatic16/Docker-Android-PPV-Picker.git
cd Docker-PPV-Picker/Docker-PPV-Picker-mobile

# 2️⃣ Build a APK using Docker (see the next section for signing details)
./build-apk.sh
```

The app will launch on the device/emulator pointing at `http://localhost:8081` (Metro). If you prefer a physical device, enable USB debugging and ensure the device is visible to `adb`.

---

## Getting Started – Firestick

The Firestick flavor is built for **armeabi‑v7a** devices (e.g., Amazon Fire TV Stick) and uses the same source code. The only differences are Gradle configuration and the Docker‑based build script.

```bash
# 1️⃣ Clone and cd into the Firestick directory
git clone github.com/Lunatic16/Docker-Android-PPV-Picker.git
cd Docker-PPV-Picker/Docker-PPV-Picker-Firestick

# 2️⃣ Build a APK using Docker (see the next section for signing details)
./build-apk.sh
```

The script will prompt for the keystore password and key password, then output `output/ppvpicker-release.apk`. Transfer the APK to the Firestick (e.g., via `adb install`) and launch.

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run start` | Starts the Metro bundler (`react-native start`). |
| `npm run android` | Builds and runs the app on a connected Android device or emulator (`react-native run-android`). |
| `npm run lint` | Runs ESLint over the TypeScript source. |
| `npm run ts-check` | Executes the TypeScript compiler in `noEmit` mode – validates types without emitting files. |

---

## Building Signed APKs

Both flavors provide a `build-apk-signed.sh` wrapper that runs the Docker builder defined in the respective `Dockerfile`. The script:
1. Prompts for **keystore** and **key** passwords (no secrets are stored in source). 
2. Mounts the project source, a persistent Gradle cache, and the keystore into the container.
3. Injects the signing credentials into `android/gradle.properties` inside the container.
4. Executes `./gradlew assembleRelease`.
5. Copies the resulting `app-release.apk` to `output/ppvpicker-release.apk` on the host.

This produces the optimised, minified APK for sideloading on Android boxes.
Generate a signing keystore (one-time):
```bash
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore ppvpicker-release.keystore \
  -alias ppvpicker \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Move the keystore file somewhere safe and set these in android/gradle.properties (or export as environment variables):
RELEASE_STORE_FILE=/absolute/path/to/ppvpicker-release.keystore
RELEASE_STORE_PASSWORD=yourpassword
RELEASE_KEY_ALIAS=ppvpicker
RELEASE_KEY_PASSWORD=yourpassword

### Manual (non‑Docker) Build

If you wish to build locally without Docker:
```bash
cd PPVPicker/android
./gradlew assembleRelease
# The APK will be at app/build/outputs/apk/release/app-release.apk
```
Make sure the signing configuration is present in `android/gradle.properties` (see the script for the required keys).

---

## Testing

The repository does **not** currently contain a test suite. Adding Jest/React‑Native‑Testing‑Library tests or native unit tests is recommended for future releases. The README includes a placeholder section for completeness.

---

## Architecture Overview

### React Native Stack
- **Entry point** – `App.tsx` mounts `AppNavigator` inside a root `View`.
- **Navigation** – `AppNavigator.tsx` defines a stack navigator using `@react-navigation/native-stack`. Screens include `EventListScreen`, `StreamSelectionScreen`, and `VideoPlayerScreen`.
- **State** – Global state is stored in a lightweight **Zustand** store (`useAppStore.ts`). It holds the currently selected event, streaming URLs, and loading flags.
- **API Client** – `api/ppvClient.ts` encapsulates fetch calls to the backend PPV service (details omitted for brevity).
- **UI Components** – `EventCard`, `EmbedCard`, and theming (`theme.ts`) provide a consistent visual style. The theme file defines a `Colors` object used throughout the app.

### Android Build
- **Gradle** – Uses Gradle 8.6 with Java 17. The Firestick flavor restricts `abiFilters` to `armeabi‑v7a` and disables the new Fabric architecture for compatibility with Android 9.
- **Hermes** – Enabled (`hermesEnabled = true`) to reduce runtime memory use.
- **Multidex** – Enabled because the method count exceeds 65 k.
- **Signing** – Debug signing is static; release signing is injected at build time via environment variables or `gradle.properties` (handled by the Docker script).

---

## Environment Variables

The app does not read runtime environment variables. All configuration is compile‑time (Gradle) or injected via the Docker signing script. No `.env` file is required.

---

## Troubleshooting

| Issue | Likely Cause | Fix |
|---|---|---|
| **Metro bundler fails to start** | Node version mismatch or missing dependencies | Run `npm install` again; ensure Node ≥ 20. |
| **`gradlew` command not found** | Permissions or missing executable flag | Run `chmod +x android/gradlew` before invoking Gradle. |
| **APK size too large** | Unnecessary ABIs compiled | For Firestick, the `abiFilters "armeabi‑v7a"` line already reduces size. Verify you are using the Firestick flavor. |
| **App crashes on launch (Android 9)** | Using Fabric/TurboModules which are unsupported on older devices | The `newArchEnabled = false` flag in `android/app/build.gradle` disables the new architecture. |
| **Signing fails (`KEYSTORE_PASSWORD` incorrect)** | Wrong password entered at script prompt | Re‑run `./build-apk-signed.sh` and provide the correct passwords. |
| **Missing Java 17** | Host system does not have JDK 17 (Docker image includes it) | If building locally, install JDK 17 (`sudo apt install openjdk-17-jdk`). |

---

## Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/foo`).
3. Make your changes, ensuring TypeScript compilation passes (`npm run ts-check`).
4. Run ESLint (`npm run lint`) and fix any warnings.
5. Open a Pull Request describing the change and any relevant testing steps.

---

## License

This project is licensed under the MIT License – see `LICENSE` for details.
# Docker-Android-PPV-Picker
