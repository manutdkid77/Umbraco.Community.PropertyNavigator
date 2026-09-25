# Umbraco.Community.PropertyNavigator

Find and jump to any field on an Umbraco content node, without hunting through tabs.

**Click the Content view** (top right) while you're already on it and a dropdown lists every field on the node — just like v13's Content app. Type to filter by name (and optionally alias / description), click a field — the editor switches to the right tab, scrolls to the field and briefly rings it.

**See it in action**

![Property Navigator: opening the dropdown, filtering and jumping to a field](https://raw.githubusercontent.com/manutdkid77/Umbraco.Community.PropertyNavigator/main/docs/screenshots/demo.gif)

## Configuration

**Filter as you type**

![Filtering the dropdown to a handful of matching fields](https://raw.githubusercontent.com/manutdkid77/Umbraco.Community.PropertyNavigator/main/docs/screenshots/filter.png)

All settings are optional. Anything you leave out uses its default below, and with no `Umbraco.Community.PropertyNavigator` section at all the package is simply on with the defaults. To change something, add to `appsettings.json`:

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
| `ShowDescriptions` | `false` | Show each field's description (and match it when filtering). |
| `ShowAliases` | `false` | Show each field's property alias (and match it when filtering), for all users. |
| `HighlightField` | `true` | Briefly draw a ring around the field after jumping to it. `false` just scrolls to it. |

**With `ShowAliases` enabled**

![ShowAliases enabled: each field's property alias shown next to its name](https://raw.githubusercontent.com/manutdkid77/Umbraco.Community.PropertyNavigator/main/docs/screenshots/aliases.png)

**With `ShowDescriptions` enabled**

![ShowDescriptions enabled: each field's description shown under its name](https://raw.githubusercontent.com/manutdkid77/Umbraco.Community.PropertyNavigator/main/docs/screenshots/descriptions.png)

Changes apply on the next backoffice page load; no restart needed.

**Jump to a field, with a highlight ring**

![The editor scrolled to a field, still showing the highlight ring after a jump](https://raw.githubusercontent.com/manutdkid77/Umbraco.Community.PropertyNavigator/main/docs/screenshots/highlight.png)

## Compatibility

Umbraco 17.
