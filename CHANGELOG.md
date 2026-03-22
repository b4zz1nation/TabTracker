# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
- Ongoing refinements for the second iteration of version 1.

## [1.2.0] - Iteration 4 - 2026-03-22
### Added
- "Dark Bluey" OLED Dark Mode (Gray-950) with refined Gray-900 elevated cards and Gray-800 borders.
- High-Contrast Light Mode with pure White cards/inputs and Gray-200 borders for better visibility.
- PHP (₱) Currency support throughout the application.
- Modern "Display Name" card style for customer transaction headers.
- "Delete Contact" feature in the Select Customer screen via long-press.
- Real-time "Already Taken!" duplicate name validation in the Add Customer screen.
- Smart "Save" button disabling when required fields are empty or invalid.
- Guards for interest settings: disabled if name or amount fields are empty.

### Changed
- Refined Dashboard long-press behavior: "Clear Transaction" now clears ongoing lends while preserving the contact.
- Replaced floating top toast validation with discreet, context-aware highlights and label-level errors.
- Unified "one-pager" aesthetic with consistent background colors and subtle dividing borders.

### Fixed
- Fixed duplicate name bug in the Add Customer flow.
- Resolved input field visibility issues during keyboard interaction.
- Fixed layout clipping for "Already Taken!" error text.

## [1.1.0] - Iteration 2 - 2026-03-21
### Added
- NativeWind styling integration across the app.
- Real-time balance updates on the dashboard and customer detail screens.
- Automated customer balance re-calculation after lend deletion or status changes.
- `CHANGELOG.md` for tracking project evolution.

### Changed
- Improved deletion flow with two-step confirmation and immediate state synchronization.
- Enhanced UI aesthetics with modern design principles (gradients, better typography, and consistent spacing).
- Updated roadmap in `guidelines.md` to reflect Phase 1, Iteration 2 status.

### Fixed
- Fixed "Total Owed to You" calculation to accurately reflect the sum of all customer balances.
- Resolved NativeWind configuration errors (`ERR_UNSUPPORTED_ESM_URL_SCHEME`) on Windows.

## [1.0.0] - Iteration 1 - 2026-03-15
### Added
- Initial project setup with Expo SDK 54, Expo Router, and SQLite.
- Core CRUD operations for customers.
- Simple lending tracking system.
- Basic dashboard for overviewing balances.
