# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
- Ongoing refinements for the second iteration of version 1.

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
