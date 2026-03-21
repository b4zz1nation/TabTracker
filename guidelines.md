# TabTracker Development Guidelines

This document outlines the roadmap, architectural decisions, and development standards for the TabTracker application. It serves as a single source of truth for the project's evolution.

## 🚀 Project Roadmap

### Phase 1: Core Tab Tracking (Iteration 2)
The initial goal is to provide a seamless "one-tap" experience for tracking debts and balances. Iteration 2 focuses on refining the balance logic and deletion flows.

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
