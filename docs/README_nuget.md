# Property Navigator

Find and jump to any field on an Umbraco content node, without hunting through tabs.

**Click the Content view** (top right) while you're already on it and a dropdown lists every field on the node — just like v13's Content app. Type to filter by name (and optionally alias / description), click a field — the editor switches to the right tab, scrolls to the field and briefly rings it.

## Configuration

All settings are optional. Anything you leave out uses its default below, and with no `PropertyNavigator` section at all the package is simply on with the defaults. To change something, add to `appsettings.json`:

```json
"PropertyNavigator": {
  "Enabled": true,
  "EnableSearch": true,
  "ShowDescriptions": false,
  "ShowAliases": false
}
```

| Setting | Default | What it does |
|---|---|---|
| `Enabled` | `true` | Master switch. `false` turns the package off: the Content view behaves exactly as stock Umbraco. |
| `EnableSearch` | `true` | Show the filter box above the list. |
| `ShowDescriptions` | `false` | Show each field's description (and match it when filtering). |
| `ShowAliases` | `false` | Show each field's property alias (and match it when filtering), for all users. |

Changes apply on the next backoffice page load; no restart needed.

## Compatibility

Umbraco 17.
