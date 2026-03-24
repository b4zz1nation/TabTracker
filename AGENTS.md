# AGENTS.md

This file defines how any coding agent should work in this repository.

## Mission

Build and maintain TabTracker with minimal regressions, clear UI behavior, and isolated changes.

## Read First

Before editing:
1. Read `guidelines.md`.
2. Inspect target files before proposing changes.
3. Keep edits scoped to the user request.

## Non-Negotiable Rules

- Do not modify onboarding slide architecture unless explicitly requested.
- Do not remove onboarding `React.memo` wrappers.
- Never call router navigation methods during render.
- For modal/slide keyboard behavior, do not use `KeyboardAvoidingView` with `padding`.
- Use `Animated.Value` with `translateY` and keyboard listeners for modal/slide keyboard handling.
- Keep tab bar at 5 visible entries only.
- Do not add hidden tab routes to `app/(tabs)/_layout.tsx`.
- Always set `keyboardShouldPersistTaps="handled"` on `ScrollView` or `FlatList` containing inputs or buttons.
- Keep hook dependency arrays complete and stable.

## Animation Contract

- Spring defaults:
- `damping: 28`
- `stiffness: 300`
- `useNativeDriver: true`
- Avoid overshoot for modal-like transitions.

## Navigation Contract

- Call `router.push`, `router.back`, `router.replace` only in event handlers or controlled effects.
- Do not navigate at render time.

## Form Contract

- Money input:
- numeric keyboard
- sanitize to digits plus one decimal point
- placeholder `0` where applicable
- save `0` when blank if requested by flow
- Primary action buttons should be disabled/dimmed when required fields are empty.

## Data and State

- SQLite is source of truth.
- Use existing hooks:
- `useCustomers`
- `useLends`
- `useCreditors`
- Preserve refresh patterns after mutating DB state.

## Safe Change Boundaries

- For UI requests, edit only the relevant screen/component unless the change explicitly requires wider updates.
- Do not refactor unrelated files in the same pass.
- Do not alter labels/icons/order of existing navbar items unless explicitly requested.

## Preferred Workflow For New Chats

1. Confirm target file(s) and constraints.
2. Implement smallest valid patch.
3. Verify no unrelated behavior changed.
4. Report exactly what changed and what was not touched.
