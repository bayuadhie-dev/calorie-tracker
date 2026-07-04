# 👾 Retro Calorie Tracker

A gamified, offline-first daily calorie and hydration tracker with a nostalgic **8-bit monochrome pixel art aesthetic**. Built using **React Native (Expo SDK 54)** and **SQLite**, it helps you track your fitness goals (Diet, Maintenance, or surplus/Bulking) without internet connectivity or complex account setups.

Developed by **Mochammad Bayu Adhie Nugroho**.

---

## 🚀 Key Features

*   **🍛 1,300+ Indonesian Food Database:** Integrated with the official Indonesian Food & Nutrition Dataset (TKPI Kemenkes) and enriched with popular street food (Martabak, Batagor, Pempek, Gorengan) and supermarket snacks (Indomie, Chitato, Oreo).
*   **🥄 Practical Serving Units:** Track your meals using local household units (e.g., *centong* of rice, *butir* of egg, *potong* of tempeh, *gelas* of coffee) with automatic gram conversion.
*   **🎯 BMR & TDEE Target Calculator:** Automatically calculates your personal BMR, TDEE, and daily macro targets (Carbs, Protein, Fat) based on your age, current weight, height, activity level, and **Target Weight**.
*   **🥛 Dynamic Hydration Tracker:** Tracks your daily water intake with active visual representations of filled retro glasses and a dynamic water target based on your weight and activity level.
*   **🎮 Gamified Habit Checklist:** Accomplish daily healthy checklist items (eating fruits/veggies, working out, sleeping early) to hear crisp, retro 8-bit sound effects (Beep, Blip, Level Up!).
*   **📅 Daily Auto-Reset Guard:** Automatically detects date changes, wraps up today's logs into a summarized historical record, locks the record, and resets the active dashboard.
*   **💾 Offline Backup & Restore:** Export your entire local SQLite database into a JSON file, share it via native drawers (Google Drive/WhatsApp), and restore your data instantly.
*   **🔒 100% Offline & Private:** Zero account registration or network connection required. Your personal body metrics and logging data never leave your phone.

---

## 🛠️ Technology Stack

*   **Core Framework:** React Native (Expo SDK 54)
*   **Navigation:** Expo Router (File-system routing)
*   **Styling & UI:** NativeWind (Tailwind CSS) with custom Retro Pixel-Art borders and shadows
*   **State Management:** Zustand (Fast, decoupled global stores)
*   **Database Engine:** Expo SQLite (Local SQL database connection)
*   **Audio Assets:** Expo AV (8-bit synthesized retro WAV sound effects)
*   **Custom Typography:** PressStart2P-Regular (Google Fonts)

---

## 📂 Folder Structure

```text
├── app/                      # Expo Router Navigation & Screen Layouts
│   ├── (onboarding)/         # Onboarding flow (Step 1 to 4)
│   ├── (tabs)/               # Main screen tabs (Dashboard, Meal Planner, History, Settings)
│   └── _layout.tsx           # Global Root Navigation & Android Status Bar handler
├── assets/                   # App icons, splash screens, and 8-bit sound effects (sfx/)
├── src/                      # Source code directory
│   ├── components/ui/        # Reusable pixelated components (PixelButton, PixelCard, PixelProgressBar)
│   ├── db/                   # Database Client migrations, DDL Schema, and TKPI JSON seed
│   ├── engine/               # Math calculations (BMR, TDEE, Water Target, Daily Rollover Reset)
│   ├── hooks/                # Custom React Hooks (Daily Reset Guard, Audio playback trigger)
│   ├── repositories/         # Database access layers (Food, Logs, Profile, Water, Activity checklist)
│   ├── store/                # Zustand State stores (DashboardStore, ProfileStore, SettingsStore)
│   ├── theme/                # Visual theme systems (Colors, Fonts)
│   └── utils/                # Utility modules (Document Picker, Backup JSON exporter/importer)
├── package.json              # Mapped dependency versions
└── eas.json                  # Expo cloud build configurations for standalone APK
```

---

## ⚙️ Setup & Installation (Local Development)

To run the application locally on your machine:

1.  **Clone this repository:**
    ```bash
    git clone https://github.com/bayuadhie-dev/calorie-tracker.git
    cd calorie-tracker
    ```

2.  **Install dependencies:**
    Due to peer type overrides in Expo SDK 54's environment, install dependencies with the `--legacy-peer-deps` flag:
    ```bash
    npm install --legacy-peer-deps
    ```

3.  **Start the Metro bundler:**
    Start Expo with the clear-cache flag to rebuild module resolutions cleanly:
    ```bash
    npx expo start --tunnel --clear
    ```

4.  **Open the app:**
    Download **Expo Go** from the Google Play Store (Android) or App Store (iOS), open the camera, and scan the QR code displayed in the terminal.

---

## 📦 How to Build Standalone APK Installer

We use **Expo Application Services (EAS)** Cloud Build to generate direct Android installable `.apk` files without needing a local Android Studio SDK:

1.  **Install EAS CLI globally:**
    ```bash
    npm install -g eas-cli
    ```
2.  **Login to your Expo account:**
    ```bash
    npx eas-cli login
    ```
3.  **Configure build parameters:**
    ```bash
    npx eas-cli build:configure
    ```
4.  **Start Android APK cloud compilation:**
    ```bash
    npx eas-cli build --platform android --profile preview
    ```
5.  Once the build finishes (approx. 5-8 minutes), scan the final terminal QR Code or click the download link to download the `.apk` file directly to your phone!

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

## 👾 Author & Credits

Designed and programmed with 🖤 by **Mochammad Bayu Adhie Nugroho** (`bayuadhie-dev`).
