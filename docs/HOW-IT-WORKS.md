# Property Navigator — how it works

Implementation notes for contributors. For installing and configuring the
package, see the [root README](../README.md).

Clicking the workspace's **Content** view (top right) while it's already active
drops down a navigator listing every field on the node — just like v13's Content
app. Type to filter, click a field to jump straight to it.

> The backoffice side is plain no-build JS (no Vite, no npm) under the package's
> `wwwroot/App_Plugins/PropertyNavigator/`; a little C# exposes the appsettings.

## Features

- **Lists every property** on the current content node (friendly name, plus the
  field's **description** and property **alias** when enabled in config).
- **Type-ahead filter** (can be turned off) — matches the name, plus the alias /
  description when those are shown; matches are wrapped in `<mark>`.
- **Grouped & ordered** — grouped under their **tab**, in the editor's own order
  (tab order, then each field's per-tab `sortOrder`).
- **Click to jump** — switches to the right Content sub-tab, scrolls to the
  field and briefly rings it.
- **Toggle** — click Content again, press Escape or click away to close.
  Clicking Content from another view (e.g. Info) just switches views as normal.

## The files

The package is a Razor Class Library. Its `wwwroot/` ships as **static web
assets**, and `<StaticWebAssetBasePath>/</StaticWebAssetBasePath>` serves them
at `/App_Plugins/PropertyNavigator/*` (not `/_content/<PackageId>/…`), so
Umbraco's `App_Plugins` manifest discovery works unchanged.

```
wwwroot/App_Plugins/PropertyNavigator/
├── umbraco-package.json            # extension manifest
├── property-navigator-config.js    # fetches the appsettings config (once per page)
├── property-navigator-core.js      # base class: data, filter/sort/group, jump, list UI
└── property-navigator-dropdown.js  # the Content-view dropdown
```

## Getting the data

`PropertyNavigatorBase` consumes `UMB_DOCUMENT_WORKSPACE_CONTEXT` and observes
two things on its structure manager:

- `contentTypeProperties` — every property (`name`, `alias`, `description`, and
  the `container` group it belongs to).
- `contentTypeMergedContainers` — the **Tabs**, each with its `name`,
  `sortOrder` and the group `ids` merged into it. That maps a property → its
  tab, which drives navigation, headings and ordering.

Both feed Lit reactive state, so the list re-renders as they arrive.

## Configuration (appsettings → backoffice)

The browser can't read `appsettings.json`, so the C# side bridges it:

1. `PropertyNavigatorComposer` binds `PropertyNavigatorOptions` from the
   `PropertyNavigator` section. Every setting is optional: missing keys (or a
   missing section) keep the property initialisers' defaults, and the client's
   `DEFAULT_CONFIG` mirrors them.
2. `PropertyNavigatorConfigController` (a `ManagementApiControllerBase`) serves
   it at `GET /umbraco/management/api/v1/property-navigator/config`, behind the
   `SectionAccessContent` policy, in its own Swagger document. It reads
   `IOptionsMonitor.CurrentValue`, so edits apply on the next backoffice load.
3. `property-navigator-config.js` takes the backoffice API config from
   `UMB_AUTH_CONTEXT` (`getOpenApiConfiguration()` → base URL, `token()`,
   `credentials`) and calls `fetch` with `Authorization: Bearer <token>`. One
   request per page, shared; on failure it falls back to the defaults.

> **Why not `umbHttpClient`?** Two traps, found the hard way:
> - It only attaches auth when the call declares
>   `security: [{ scheme: 'bearer', type: 'http' }]` (as Umbraco's generated SDK
>   does). A bare `umbHttpClient.get({ url })` goes out **anonymous** → 401
>   (OpenIddict `missing_token`) even for a signed-in user.
> - Its interceptor treats **any** 401 as an expired session and forces a
>   re-login — so that call caused a **login → logout loop** on every load.
>
> With plain `fetch`, auth is explicit and a failed optional call can only mean
> "use the defaults", never "log the user out".

With a setting off, that text is neither rendered nor matched by the filter, so
a row never matches on text you can't see. It's display configuration, not a
security boundary.

`Enabled: false` is a kill switch (e.g. if an Umbraco update breaks the tab
hook): the dropdown ignores Content-tab clicks, so the view behaves as stock
Umbraco. It also ignores them until the config has loaded, so a disabled
package never opens the panel, even on the very first click.

## Opening from the Content view

There's no extension point on the workspace view tabs — each is a plain
`uui-tab` (`data-mark="workspace:view-link:Umb.WorkspaceView.Document.Edit"`)
inside `umb-workspace-editor`. So the dropdown is registered as a
`workspaceFooterApp` — purely to live inside the document workspace; it renders
nothing visible (`display: contents`) — and hooks the tab from the DOM:

- It walks up its shadow hosts to `umb-workspace-footer` and listens on the
  shadow root containing it, which also holds the editor's view tabs. The
  listener is **delegated** (checks `composedPath()`), so it survives tab
  re-renders, and **scoped** to this workspace.
- A **capture-phase** `click` on the tab while it's `active` is cancelled
  (`preventDefault` + `stopPropagation`) and toggles the panel instead.
- The panel is a native `<div popover="auto">` (top layer, light-dismiss and
  Escape for free), positioned by hand under the tab. `uui-popover-container`
  can't be used: it only anchors to a `[popovertarget]` in its own shadow root.
- Light-dismiss fires on `pointerdown` — including on the tab — so a
  `pointerdown` listener records whether it was open, making a second click close
  it rather than reopen it.
- It closes after a jump (`_onNavigated()`), and each open resets the scroll and
  focuses the search box.

If a future Umbraco version changes that `data-mark` or the footer/editor
nesting, the hook silently stops working.

## Jumping to a field

The backoffice only renders the **active** sub-tab's fields, inside shadow DOM.
So a click:

1. Resolves the property's sub-tab (via the merged-container `ids`).
2. Navigates to `/view/content/tab/<name>` by clicking a synthetic `<a>`, which
   the router handles as an in-app (no-reload) switch.
3. Polls for `umb-property[data-mark="property:<alias>"]` with a
   shadow-piercing `deepQuery`, then `scrollIntoView`s it — re-centring a few
   times, since editors above it keep growing as they lay out.
4. Rings it (`flashProperty`): an overlay in the field's shadow root, sized to
   the field's content (minus `umb-property-layout`'s 24px vertical padding)
   plus 10px, **clamped inside the surrounding `uui-box`** — a plain
   `outline-offset` pokes out of the box on the first/last field.

## Gotchas (v17, no-build)

- **No decorators.** `@customElement` / `@property` are TypeScript-only; use
  `customElements.define(...)` and `static properties = { x: { state: true } }`.
- **Use `UmbLitElement`, not `LitElement`** — it provides the context
  consume/provide machinery.
- **Properties live in shadow DOM** — hence `deepQuery`.
- **Only the active sub-tab is rendered**, so jumping needs navigation, not just
  a scroll.
- **`workspaceFooterApp`, not `workspaceAction`,** to host a custom element — a
  `workspaceAction` is api-driven and builds its own button.

## Roadmap

- Keyboard navigation (arrows + Enter to jump), each property's data type /
  editor, a count badge per tab.

## Compatibility

Umbraco 17.
