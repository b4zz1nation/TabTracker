# TabTracker Development Guidelines

This file is the project-level source of truth for product direction, architecture, and implementation rules.

## Product Scope

### Current Focus
Phase 1: core tab tracking (mobile-first, offline-first).

### Core Features
- Customer tab tracking (`customers`, `lends`, `payments`)
- My Tab tracking (`creditors`)
- Quick add flow from center tab button
- On-device persistence using SQLite

## Architecture

### Stack
- Expo SDK 54+
- Expo Router (file-based)
- NativeWind (Tailwind)
- expo-sqlite
- AsyncStorage for user profile

### Data Flow
- DB migration and schema: `services/database.ts`
- User profile storage: `services/user-profile.ts`
- Data hooks:
- `hooks/use-customers.ts`
- `hooks/use-lends.ts`
- `hooks/use-creditors.ts`
- App entry and providers: `app/_layout.tsx`
- Tab shell: `app/(tabs)/_layout.tsx`

## UI Rules

### Navigation
- Never call router navigation methods during render.
- Call `router.push`, `router.back`, `router.replace` only inside event handlers or controlled effects.
- Keep tab bar to 5 visible items only: `Home`, `Notifs`, `Add`, `Logs`, `Profile`.
- Do not add hidden tab routes inside `app/(tabs)/_layout.tsx`.

### Keyboard Behavior
- For modal/bottom-sheet style inputs, use `Animated.Value` plus `translateY`.
- Do not use `KeyboardAvoidingView` with `padding` behavior inside slide or modal components.
- Use:
- iOS: `keyboardWillShow` and `keyboardWillHide`
- Android: `keyboardDidShow` and `keyboardDidHide`
- Use `keyboardShouldPersistTaps="handled"` for any `ScrollView` or `FlatList` with inputs/buttons.

### Animation Standards
- Use critically damped springs:
- `Animated.spring(..., { damping: 28, stiffness: 300, useNativeDriver: true })`
- Avoid bounce/overshoot.
- Use native driver for transform/opacity animations.

### Form Standards
- Numeric money input must sanitize to:
- digits
- single decimal point
- Placeholder for money fields should be `0` where applicable.
- If amount is blank and spec requires it, save as `0`.
- Confirm/primary action should be dimmed or disabled when required fields are empty.

## Guardrails (Do Not Break)

### Onboarding
- Do not remove `React.memo` wrappers from onboarding slide components.
- Do not place nested `ScrollView` inside onboarding slides.
- Keep onboarding navigation context stable.

### Existing Screens
- Do not change customer list row structure unless requested.
- Do not change tab item labels/icons/order unless explicitly requested.
- Keep add flows isolated: customer tab flow and my tab flow should not interfere.

## Delivery Expectations

- Prefer isolated edits with minimal blast radius.
- Keep dependency arrays complete in `useEffect`, `useCallback`, and `useMemo`.
- Avoid introducing global refactors in feature-specific requests.
- When changing UI behavior, preserve existing business logic unless explicitly asked to change it.

## Near-Term Roadmap

- Phase 2: richer history and timeline UX
- Phase 3: search/filter/tagging
- Phase 4: optional cloud sync
