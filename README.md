# <img src="docs/icon.png" alt="Property Navigator icon" width="50" height="50" align="absmiddle" /> Property Navigator for Umbraco

[![NuGet version](https://img.shields.io/nuget/v/Umbraco.Community.PropertyNavigator?logo=nuget&label=NuGet)](https://www.nuget.org/packages/Umbraco.Community.PropertyNavigator)
[![Umbraco Marketplace](https://img.shields.io/badge/Umbraco-Marketplace-3544B1?logo=umbraco)](https://marketplace.umbraco.com/package/umbraco.community.propertynavigator)
[![Umbraco 17 | 18](https://img.shields.io/badge/Umbraco-17%20%7C%2018-3544B1?logo=umbraco)](https://umbraco.com)
[![Build](https://img.shields.io/github/actions/workflow/status/manutdkid77/Umbraco.Community.PropertyNavigator/build.yml?branch=main&logo=github&label=Build)](https://github.com/manutdkid77/Umbraco.Community.PropertyNavigator/actions/workflows/build.yml)
[![License: MIT](https://img.shields.io/github/license/manutdkid77/Umbraco.Community.PropertyNavigator?label=License)](LICENSE)

Find and jump to any property on a content node, straight from the Content view.

![Property Navigator: opening the dropdown, filtering and jumping to a field](docs/screenshots/demo.gif)

## Features

Umbraco 13 had a Content app for jumping between fields. Property Navigator
brings that back to the Umbraco 17 and 18 backoffice.

- Click the **Content** view (top right) while you're already on it, and a
  dropdown lists every field on the node.
- Type to narrow a long document type down to the field you want.
- Click a field and the editor scrolls to it, then briefly draws a ring around
  it so you can spot it.
- Open, filter, jump and close (Escape) from the keyboard if you prefer.
- Optionally show property aliases or descriptions, and match them when
  filtering.
- There's no build step and no config to write. Install the package and restart
  the site.

## Installation

```bash
dotnet add package Umbraco.Community.PropertyNavigator
```

Restart the site and open any content node.

## Configuration

All settings are optional. With no `Umbraco.Community.PropertyNavigator` section
at all, the package is simply on with the defaults. To change something, add to
`appsettings.json`:

```json
"Umbraco.Community.PropertyNavigator": {
  "Enabled": true,
  "EnableSearch": true,
  "ShowDescriptions": false,
  "ShowAliases": false,
  "HighlightField": true
}
```

| Setting | Default | What it does |
|---|---|---|
| `Enabled` | `true` | Master switch. `false` turns the package off: the Content view behaves exactly as stock Umbraco. |
| `EnableSearch` | `true` | Show the filter box above the list. |
| `ShowDescriptions` | `false` | Show each field's description, and match it when filtering. |
| `ShowAliases` | `false` | Show each field's property alias (for all users), and match it when filtering. |
| `HighlightField` | `true` | Briefly draw a ring around the field after jumping to it. `false` just scrolls to it. |

The filter always matches the field name, and only matches aliases or
descriptions when they're shown. Changes apply on the next backoffice page load
without a restart.

## Screenshots

**Filter as you type**

![Filtering the dropdown to a handful of matching fields](docs/screenshots/filter.png)

**Jump to a field, with a highlight ring**

![The editor scrolled to a field, still showing the highlight ring after a jump](docs/screenshots/highlight.png)

**With `ShowAliases` enabled**

![ShowAliases enabled: each field's property alias shown next to its name](docs/screenshots/aliases.png)

**With `ShowDescriptions` enabled**

![ShowDescriptions enabled: each field's description shown under its name](docs/screenshots/descriptions.png)

## Compatibility

| Umbraco | Package |
|---|---|
| 17.x | Supported (built against 17.0.0) |
| 18.x | Supported from 1.1.0 |

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for how to run the
package locally and submit changes.

## Further reading

- [Introducing Umbraco.Community.PropertyNavigator](https://www.nathanielnunes.com/blog/introducing-umbraco-community-propertynavigator): the story behind the package.

## License

[MIT](LICENSE) © Nathaniel Nunes
