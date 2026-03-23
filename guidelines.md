# TabTracker Development Guidelines

This document outlines the roadmap, architectural decisions, and development standards for the TabTracker application. It serves as a single source of truth for the project's evolution.

## 🚀 Project Roadmap

### Phase 1: Core Tab Tracking (Iteration 4)
The initial goal is to provide a seamless "one-tap" experience for tracking debts and balances. Iteration 4 focuses on Final Polish & Launch readiness.

**High-Level Functional Requirements:**
- **Manage Customers:** CRUD operations for names and contact info (optional).
- **Control Tabs:** Quick entry/edit of current tab amounts.
- **Data Persistence:** Offline-first approach with local SQLite storage.
- **At-a-glance Balances:** Visual dashboard of all active tabs.

**Primary Screens:**
1.  **Dashboard (`app/(tabs)/index.tsx`):**
    - Scrollable list of customers.
    - Summary card with "Total Outstanding".
    - Swipe-to-delete or quick actions on customer rows.
2.  **Add/Edit Screen (`app/modal.tsx`):**
    - Modal-based form with input validation.
    - Balance input UX: the field starts empty in the "Add" flow (placeholder `0`), and saves as `0` only if left empty.
3.  **Details View (Optional - `app/customer/[id].tsx`):**
    - History of tab adjustments.

---

## 💾 Database & State Management

### Proposed SQLite Schema
| Table | Column | Type | Notes |
| :--- | :--- | :--- | :--- |
| `Customers` | `id` | INTEGER PRIMARY KEY | |
| | `name` | TEXT NOT NULL | |
| | `balance` | REAL DEFAULT 0 | Current net tab amount |
| | `created_at` | DATETIME | |

### State Strategy
- **SQLite Hooks:** Use custom hooks to wrap `expo-sqlite` calls (e.g., `useCustomers()`).
- **Real-time UI:** Combine SQlite with a React State/Context if needed for immediate UI updates before DB confirmation.

---

## 🛠 Tech Stack

-   **Runtime:** [Expo](https://expo.dev/) (SDK 54+)
-   **Navigation:** [Expo Router](https://docs.expo.dev/router/introduction/) (File-based)
-   **Styling:** **NativeWind (Tailwind CSS v4)**.
    -   Use `className` for all styling.
    -   Use `dark:` prefix for theme-specific colors (e.g., `bg-white dark:bg-black`).
    -   Common colors: `sky-500` (Primary), `rose-500` (Alert), `emerald-500` (Success).
-   **Platform:** Focus on Mobile (iOS/Android), compatible with Web.

### Quality Standards
-   **Visuals:** Use high-contrast colors for balances (e.g., green for positive, orange/red for tabs).
-   **Safe Areas:** Ensure all UI elements sit within `SafeAreaView`.
-   **Interaction:** Use `expo-haptics` for tactile feedback on tab updates.
-   **Modals:** Use `presentation: 'modal'` for the add/edit customer flow.

### UI Behavior Rules (Modal & Dashboard)
-   Balance input should be numeric-only:
    - use `keyboardType="numeric"`
    - sanitize `onChangeText` to allow only digits and a single decimal point
-   Dashboard should update immediately after modal add/edit:
    - `app/(tabs)/index.tsx` should re-fetch customers on focus using `useFocusEffect`
    - `useCustomers()` should expose a `refresh()` function that re-queries SQLite and updates local state

### Keyboard & Screen Layout Rules
-   **Global keyboard handling lives in `app/_layout.tsx`:** `KeyboardAvoidingView` + `Keyboard.dismiss` `Pressable` wrap the entire app. Individual screens do NOT need these wrappers.
-   **Reusable `ScreenContainer` component (`components/screen-container.tsx`):** Provides `SafeAreaView`, `KeyboardAvoidingView`, keyboard-dismiss-on-tap, and optional `ScrollView` in a single wrapper.
-   **EVERY new screen** must use either `ScreenContainer` or follow the same pattern (SafeAreaView → KAV → ScrollView).
-   **NEVER** use a plain `View` or `SafeAreaView` as the root of a screen that has `TextInput` fields.
-   **NEVER** place `TextInput` inside a non-scrollable container.
-   **Always** set `keyboardShouldPersistTaps="handled"` on any `ScrollView` or `FlatList` that contains buttons or inputs.
-   **Modal bottom sheets** that have `TextInput` need their own `KeyboardAvoidingView` with `keyboardVerticalOffset` (iOS: `40`, Android: `20`) to account for modal position.

---

## 📅 Future Phases
-   **Phase 2:** History Logging (Timestamped records of all changes).
-   **Phase 3:** Search & Category Tags.
-   **Phase 4:** Cloud Sync (Supabase/Firebase integration).

---

## ⚠️ Agent Safeguards (CRITICAL)

To prevent breaking the app's core navigation, onboarding, and payment logic, all AI agents MUST follow these rules:

### 1. Onboarding & Slide Components
- **Never remove `React.memo`** from `NameSlide`, `LogoSlide`, `FeaturesSlide`, `TutorialSlide`, and `SlideRenderer`. Removing memoization causes immediate remounting during parent `FlatList` scrolls, which destroys the navigation context.
- **Never introduce `ScrollView`** inside any onboarding slide component. This breaks the parent `FlatList` gesture handling and causes navigation context errors.
- **Do not modify** the parent `OnboardingScreen` component structure, `onViewableItemsChanged` logic, or the `scrollX` calculation.

### 2. Navigation & Router
- **Never reference `router` at render time.** 
- **Only call `router.replace()`** (or any navigation method) inside event handlers (e.g., `handleComplete`, `onPress`). Calling them during render results in "navigation context not found" errors.

### 3. Keyboard Handling (Slide/Modal Specific)
- **Do NOT use `KeyboardAvoidingView`** with `padding` behavior inside individual slide components. 
- **Always use `Animated.Value`** with `translateY` logic. 
- Trigger animations using `Keyboard.addListener` for `keyboardWillShow`/`keyboardDidShow` and `keyboardWillHide`/`keyboardDidHide`. This ensures the content shifts precisely without breaking the layout.

### 4. `useEffect` & Infinite Loops
- **Stable Dependencies:** Always provide a complete and stable dependency array for `useEffect`, `useCallback`, and `useMemo`.
- **Reference Management:** Wrap all object/array dependencies in `useMemo` and all function dependencies in `useCallback` if they are passed as props or used in other hooks. This is mandatory to prevent infinite render loops.

### 5. Partial Payment Validation
- **Balance Clamping:** The entered payment amount must never exceed the remaining balance.
- **Auto-Correction:** If the input exceeds the balance, automatically clamp the value to the max balance and trigger `Haptics` for feedback. 
- **Button State:** Always disable or dim the confirm button if the input is empty or zero.
113: 
114: ### 6. Animation Standards
115: - **Critically-Damped Springs:** All modal-like slides and transitions MUST use `Animated.spring` with a high damping-to-stiffness ratio (typically `damping: 28`, `stiffness: 300`). 
116: - **No Bounce Policy:** Animations should feel organic and smooth (spring physics) but have EXACTLY zero overshoot or "boing" effect. 
117: - **Native Threading:** Always set `useNativeDriver: true` for all transforms and opacity animations to ensure 60FPS performance on both iOS and Android.
118: - **Snappy Feedback:** Aim for perceived completion within 150-200ms.
