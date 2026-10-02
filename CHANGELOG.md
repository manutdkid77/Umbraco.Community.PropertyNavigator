# Changelog

All notable changes to this package are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.0.3]

### Fixed

- Keyboard: Tab off the last field in the dropdown moves to the next view tab
  (e.g. Info) instead of jumping to the footer buttons; Shift+Tab off the
  search box and Escape both return focus to the Content tab.
- Keyboard: after jumping to a field, focus returns to the Content tab instead
  of being lost.
- Accessibility: the dropdown is announced to screen readers as the "Property
  navigator" dialog.
- Keyboard: clearing the filter with the clear button keeps focus in the search
  box instead of losing it.
- Jumping to a field taller than the screen (e.g. a block list with previews)
  now lands on the top of the field rather than its middle, and keeps it there
  while slow previews load (until you scroll yourself). The highlight ring grows
  with the field.

## [1.0.2]

### Changed

- **Breaking:** `appsettings.json` configuration section renamed from
  `PropertyNavigator` to `Umbraco.Community.PropertyNavigator`. Update any
  existing config to use the new section name.

## [1.0.1]

### Changed

- Added captions above each screenshot in the README docs.

## [1.0.0]

First release, for Umbraco 17.

### Added

- Click the active Content view on a content node for a dropdown of every
  field on it — type to filter, click to jump straight to the field.
- `appsettings.json` settings under `PropertyNavigator`: `Enabled`,
  `EnableSearch`, `ShowDescriptions`, `ShowAliases` and `HighlightField`.

[Unreleased]: https://github.com/manutdkid77/Umbraco.Community.PropertyNavigator/compare/1.0.3...HEAD
[1.0.3]: https://github.com/manutdkid77/Umbraco.Community.PropertyNavigator/compare/1.0.2...1.0.3
[1.0.2]: https://github.com/manutdkid77/Umbraco.Community.PropertyNavigator/compare/1.0.1...1.0.2
[1.0.1]: https://github.com/manutdkid77/Umbraco.Community.PropertyNavigator/compare/1.0.0...1.0.1
[1.0.0]: https://github.com/manutdkid77/Umbraco.Community.PropertyNavigator/releases/tag/1.0.0
