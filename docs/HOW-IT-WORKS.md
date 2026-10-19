# How Property Navigator works

Implementation notes for contributors. For installing and configuring the
package, see the [root README](../README.md).

Clicking the workspace's **Content** view (top right) while it's already active
drops down a list of every field on the node, much like v13's Content app. Type
to filter, then click a field to jump to it.

> The backoffice side is plain no-build JS (no Vite, no npm) under the package's
> `wwwroot/App_Plugins/PropertyNavigator/`. A little C# exposes the appsettings.

## Features

- Lists every property on the current content node by its friendly name. The
  field's description and property alias are shown too when enabled in config.
- A type-ahead filter (can be turned off) matches the name, plus the alias or
  description when those are shown. Matches are wrapped in `<mark>`.
- Properties are grouped under their tab and listed in the editor's own order:
  tab order, then each field's per-tab `sortOrder`.
- Clicking a property switches to the right Content sub-tab, scrolls to the
  field and briefly rings it.
- Click Content again, press Escape or click away to close the list. Clicking
  Content from another view (e.g. Info) just switches views as normal.

## The files

The package is a Razor Class Library. Its `wwwroot/` ships as static web
assets, and `<StaticWebAssetBasePath>/</StaticWebAssetBasePath>` serves them at
`/App_Plugins/PropertyNavigator/*` instead of `/_content/<PackageId>/...`, so
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

- `contentTypeProperties`: every property, with its `name`, `alias`,
  `description` and the `container` group it belongs to.
- `contentTypeMergedContainers`: the tabs, each with its `name`, `sortOrder`
  and the group `ids` merged into it. This is how a property is mapped to its
  tab, which drives navigation, headings and ordering.

Both feed Lit reactive state, so the list re-renders as they arrive.

## Configuration (appsettings to backoffice)

The browser can't read `appsettings.json`, so the C# side passes it along:

1. `PropertyNavigatorComposer` binds `PropertyNavigatorOptions` from the
   `Umbraco.Community.PropertyNavigator` section. Every setting is optional.
   Missing keys, or a missing section, keep the property initialisers'
   defaults, and the client's `DEFAULT_CONFIG` mirrors them.
2. `PropertyNavigatorConfigController` (a `ManagementApiControllerBase`) serves
   it at `GET /umbraco/management/api/v1/property-navigator/config`, behind the
   `SectionAccessContent` policy. It registers no OpenAPI document, so it stays
   out of Umbraco's own API docs. (Umbraco 18 swapped Swashbuckle for
   `Microsoft.AspNetCore.OpenApi`, and the types differ between 17 and 18.) It
   reads `IOptionsMonitor.CurrentValue`, so edits apply on the next backoffice
   load.
3. `property-navigator-config.js` gets the backoffice API config from
   `UMB_AUTH_CONTEXT` via `getOpenApiConfiguration()`, which gives the base URL,
   `token()` and `credentials`. It then calls `fetch` with
   `Authorization: Bearer <token>`. There's one shared request per page, and if
   it fails the defaults are used.

> **Not `umbHttpClient`.** It caused two problems here:
> - It only attaches auth when the call declares
>   `security: [{ scheme: 'bearer', type: 'http' }]`, as Umbraco's generated SDK
>   does. A bare `umbHttpClient.get({ url })` goes out anonymous and gets a 401
>   (OpenIddict `missing_token`), even for a signed-in user.
> - Its interceptor treats any 401 as an expired session and forces a re-login,
>   so that call caused a login/logout loop on every load.
>
> With plain `fetch` the auth is explicit, and a failed optional call can only
> mean "use the defaults", never "log the user out".

When a setting is off, that text is neither rendered nor matched by the filter,
so a row never matches on text you can't see. This is display configuration and
not a security boundary.

`Enabled: false` is a kill switch, for example if an Umbraco update breaks the
tab hook. The dropdown ignores Content-tab clicks, so the view behaves as stock
Umbraco. It also ignores them until the config has loaded, so a disabled
package never opens the panel, even on the very first click.

## Opening from the Content view

The workspace view tabs have no extension point. Each is a plain `uui-tab`
(`data-mark="workspace:view-link:Umb.WorkspaceView.Document.Edit"`) inside
`umb-workspace-editor`. So the dropdown is registered as a `workspaceFooterApp`,
only so that it lives inside the document workspace. It renders nothing visible
(`display: contents`) and hooks the tab from the DOM:

- It walks up its shadow hosts to `umb-workspace-footer` and listens on the
  shadow root containing it, which also holds the editor's view tabs. The
  listener is delegated (it checks `composedPath()`), so it survives tab
  re-renders, and it's scoped to this workspace.
- A capture-phase `click` on the tab while it's `active` is cancelled
  (`preventDefault` + `stopPropagation`) and toggles the panel instead.
- The panel is a native `<div popover="auto">`, which gives the top layer,
  light-dismiss and Escape handling for free. It's positioned by hand under the
  tab. `uui-popover-container` can't be used because it only anchors to a
  `[popovertarget]` in its own shadow root.
- Light-dismiss fires on `pointerdown`, including on the tab itself. A
  `pointerdown` listener records whether the panel was open, so a second click
  closes it instead of reopening it.
- It closes after a jump (`_onNavigated()`), and each open resets the scroll and
  focuses the search box.
- The panel sits in the footer in DOM order, so Tab would run from its last
  item into the footer buttons. A `keydown` handler sends Tab off the end to
  the next view tab (e.g. Info) and Shift+Tab off the search box back to
  Content. Escape, and a jump made from inside the panel, also return focus to
  the Content tab. `uui-tab` doesn't delegate focus, so this focuses the tab's
  inner `#button` link. Clearing the filter refocuses the search box, since the
  clear button disappears with the text.
- The panel has `role="dialog"` and `aria-label="Property navigator"` so screen
  readers announce it.

If a future Umbraco version changes that `data-mark` or the footer/editor
nesting, the hook stops working without any error.

## Jumping to a field

The backoffice only renders the active sub-tab's fields, inside shadow DOM. So
clicking a field:

1. Resolves the property's sub-tab from the merged-container `ids`.
2. Navigates to `/view/content/tab/<name>` by clicking a synthetic `<a>`, which
   the router handles as an in-app switch without a reload.
3. Polls for `umb-property[data-mark="property:<alias>"]` with a
   shadow-piercing `deepQuery`, then calls `scrollIntoView` on it. A field that
   fits the scroll area is centred. A taller one (e.g. a block list with
   previews) is top-aligned, so you land on its label instead of its middle.
   The scroll area is found by walking up the rendered tree through slots
   (`assignedSlot`). The workspace's `uui-scroll-container` is in a shadow root
   that the fields are slotted into, so a plain `parentElement` walk misses it.
4. Re-aligns at intervals for about 3s, because editors (block previews
   especially) keep growing as they load. It stops on the first `wheel`,
   `keydown`, `pointerdown` or `touchstart` so it never fights the user, and a
   new jump cancels the previous one's timers.
5. Rings the field (`flashProperty`) with an overlay in its shadow root, 10px
   outside the field's content minus `umb-property-layout`'s 24px vertical
   padding. The ring is clamped inside the surrounding `uui-box`, because a
   plain `outline-offset` pokes out of the box on the first and last field.
   It's positioned by its four edges instead of a fixed size, so it grows with
   the field if previews finish loading mid-animation.

## Gotchas (v17/v18, no-build)

- The package builds against 17.0.0 and the same binary runs on 17 and 18, so
  the C# may only use APIs that exist in both. Nothing OpenAPI-related does.
- Decorators like `@customElement` and `@property` are TypeScript-only. Use
  `customElements.define(...)` and `static properties = { x: { state: true } }`.
- Extend `UmbLitElement`, not `LitElement`. It provides the context
  consume/provide machinery.
- Properties are in shadow DOM, hence `deepQuery`.
- Only the active sub-tab is rendered, so jumping needs navigation as well as a
  scroll.
- Use `workspaceFooterApp` to host a custom element. A `workspaceAction` is
  api-driven and builds its own button.

## Compatibility

Umbraco 17 and 18. Everything the JS hooks into is the same on both: the view
tab's `data-mark`, the `umb-workspace-footer` nesting, `uui-tab`'s inner
`#button`, `umb-property[data-mark]` and `getOpenApiConfiguration()`. UUI 2.0
(Umbraco 18) removed `uui-popover` and `uui-caret`, and neither is used.
