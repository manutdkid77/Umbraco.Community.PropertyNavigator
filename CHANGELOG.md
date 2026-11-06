# Changelog

All notable changes to this package are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.2.0]

### Added

- `SearchPlaceholder` setting for the filter box's placeholder text. Leave it
  out or empty to keep the built-in text, which names the fields the filter
  matches ("Filter by name…" by default, "Filter by name or alias…" with
  `ShowAliases` on, and so on).
- Press Enter in the filter box to jump to the top match, inspired by VS Code's
  command palette (Ctrl+Shift+P). While you type, the top row is shaded and
  shows an "Enter" hint, and screen readers hear the match count and which field
  Enter goes to. Tab still moves through the results, and the shading goes away
  once you do.
- Up and Down arrows move between the search box and the results. Press Enter
  on a result to jump to it.

### Changed

- Focused fields in the dropdown now show Umbraco's blue focus outline instead
  of the browser's black one, matching the highlight ring after a jump.

### Fixed

- The browser's autofill suggestions no longer drop down over the results while
  you type in the filter box.
- Jumping to a field respects the "reduce motion" system setting: the page moves
  straight there instead of smooth scrolling.
- Jumping to a field on a tab that takes more than about 2 seconds to render
  (e.g. one with block previews) now still scrolls to and highlights the field,
  instead of stopping at the tab. Scrolling, clicking, typing or starting
  another jump cancels the wait.
- All of the package's scripts now load fresh for each new version on Umbraco
  17.6+ and 18.1+.

## [1.1.0]

### Added

- Umbraco 18 support. One package covers both 17 and 18; its Umbraco
  dependency is now `[17.0.0, 19.0.0)`.

### Changed

- The config endpoint no longer has its own Swagger document. Umbraco 18
  replaced Swashbuckle, and registering the document stopped 1.0.x loading
  there. The endpoint itself is unchanged.

### Note

- 1.0.x had no upper Umbraco bound, so NuGet will still offer it to
  Umbraco 18 sites, where it fails at startup. Use 1.1.0 or later on 18.

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
  field on it. Type to filter, then click to jump straight to the field.
- `appsettings.json` settings under `PropertyNavigator`: `Enabled`,
  `EnableSearch`, `ShowDescriptions`, `ShowAliases` and `HighlightField`.

[Unreleased]: https://github.com/manutdkid77/Umbraco.Community.PropertyNavigator/compare/1.2.0...HEAD
[1.2.0]: https://github.com/manutdkid77/Umbraco.Community.PropertyNavigator/compare/1.1.0...1.2.0
[1.1.0]: https://github.com/manutdkid77/Umbraco.Community.PropertyNavigator/compare/1.0.3...1.1.0
[1.0.3]: https://github.com/manutdkid77/Umbraco.Community.PropertyNavigator/compare/1.0.2...1.0.3
[1.0.2]: https://github.com/manutdkid77/Umbraco.Community.PropertyNavigator/compare/1.0.1...1.0.2
[1.0.1]: https://github.com/manutdkid77/Umbraco.Community.PropertyNavigator/compare/1.0.0...1.0.1
[1.0.0]: https://github.com/manutdkid77/Umbraco.Community.PropertyNavigator/releases/tag/1.0.0
