// Property Navigator core: data, filtering, jump-to-field and the list UI, shared by every surface that shows the navigator.
// No-build vanilla JS; the bare imports resolve through the backoffice's import map.

import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { html, css } from "@umbraco-cms/backoffice/external/lit";
import { UMB_DOCUMENT_WORKSPACE_CONTEXT } from "@umbraco-cms/backoffice/document";
import {
  DEFAULT_CONFIG,
  getPropertyNavigatorConfig,
} from "./property-navigator-config.js";

// querySelector that also searches inside nested shadow roots (the backoffice is all shadow DOM).
function deepQuery(selector, root = document) {
  const direct = root.querySelector(selector);
  if (direct) return direct;
  for (const el of root.querySelectorAll("*")) {
    if (el.shadowRoot) {
      const found = deepQuery(selector, el.shadowRoot);
      if (found) return found;
    }
  }
  return null;
}

const RING_PADDING = 10; // px between the field's content and the highlight ring
const RING_INSET = 4; // min px between the ring and the edge of the field's uui-box

// Parent across shadow boundaries (a shadow root's parent is its host).
const parentAcross = (n) => n.parentElement ?? n.getRootNode().host ?? null;

// Fade a rounded ring in and out around the field we jumped to, padded but clamped inside its box.
function flashProperty(el) {
  el.shadowRoot?.querySelector(".propnav-flash")?.remove();
  const root = el.shadowRoot ?? el;

  const accent =
    getComputedStyle(el).getPropertyValue("--uui-color-focus").trim() ||
    "#3544b1";

  // Content rect = the field minus umb-property-layout's padding (24px top/bottom, none at the sides).
  const host = el.getBoundingClientRect();
  const layout = el.shadowRoot?.querySelector("umb-property-layout");
  const pad = layout ? getComputedStyle(layout) : null;
  const px = (v) => parseFloat(v) || 0;
  let top = host.top + px(pad?.paddingTop) - RING_PADDING;
  let bottom = host.bottom - px(pad?.paddingBottom) + RING_PADDING;
  let left = host.left + px(pad?.paddingLeft) - RING_PADDING;
  let right = host.right - px(pad?.paddingRight) + RING_PADDING;

  // Keep the ring inside the surrounding box so it never pokes out on the first/last field.
  let box = parentAcross(el);
  while (box && box.localName !== "uui-box") box = parentAcross(box);
  if (box) {
    const b = box.getBoundingClientRect();
    top = Math.max(top, b.top + RING_INSET);
    bottom = Math.min(bottom, b.bottom - RING_INSET);
    left = Math.max(left, b.left + RING_INSET);
    right = Math.min(right, b.right - RING_INSET);
  }

  // The ring is positioned relative to the field, so make it a containing block until the animation ends.
  const prevPosition = el.style.position;
  if (getComputedStyle(el).position === "static") el.style.position = "relative";

  // Overlay in the field's shadow root: scrolls with it, takes no layout, can't block clicks.
  const ring = document.createElement("div");
  ring.className = "propnav-flash";
  Object.assign(ring.style, {
    position: "absolute",
    top: `${top - host.top}px`,
    left: `${left - host.left}px`,
    width: `${right - left}px`,
    height: `${bottom - top}px`,
    boxSizing: "border-box",
    border: `2px solid ${accent}`,
    borderRadius: "6px",
    pointerEvents: "none",
    zIndex: "1",
  });
  root.appendChild(ring);

  const anim = ring.animate(
    [
      { opacity: 0, transform: "scale(1.015)" },
      { opacity: 1, transform: "scale(1)", offset: 0.15 }, // settle in
      { opacity: 1, transform: "scale(1)", offset: 0.7 }, // hold
      { opacity: 0, transform: "scale(1)" }, // fade out in place
    ],
    { duration: 2200, easing: "ease-out" },
  );
  const cleanup = () => {
    ring.remove();
    el.style.position = prevPosition;
  };
  anim.onfinish = cleanup;
  anim.oncancel = cleanup;
}

export class PropertyNavigatorBase extends UmbLitElement {
  // Reactive state (no-decorator @state()): the node's properties, filter text, its Tabs, and the appsettings config.
  static properties = {
    _properties: { state: true },
    _filter: { state: true },
    _tabs: { state: true },
    _groups: { state: true },
    _config: { state: true },
  };

  #workspace; // the document workspace context, once consumed

  constructor() {
    super();

    this._properties = [];
    this._filter = "";
    this._tabs = [];
    this._groups = new Map();
    // Render with the defaults until the config (fetched once per page) arrives.
    this._config = DEFAULT_CONFIG;
    this._configLoaded = false; // lets surfaces stay inert until they know whether they're enabled
    getPropertyNavigatorConfig(this).then((config) => {
      this._config = config;
      this._configLoaded = true;
    });

    // The callback can fire again (context replaced) or with undefined (context lost).
    this.consumeContext(UMB_DOCUMENT_WORKSPACE_CONTEXT, (context) => {
      this.#workspace = context;
      if (!context) return;

      // Every property on the node's content type (observe() unsubscribes automatically).
      this.observe(
        context.structure.contentTypeProperties,
        (props) => {
          this._properties = props ?? [];
        },
        "propNavProperties",
      );

      // The Tabs; each lists the container `ids` merged into it (one per content type/composition that has it).
      this.observe(
        context.structure.contentTypeMergedContainers,
        (containers) => {
          this._tabs = (containers ?? []).filter((c) => c.type === "Tab");
        },
        "propNavContainers",
      );

      // Groups, from every content type and composition: a property inside a group points at the group,
      // and the group's `parent` is the tab it sits on (null for a group that isn't on a tab).
      this.observe(
        context.structure.contentTypes,
        (types) => {
          const groups = new Map();
          for (const type of types ?? []) {
            for (const c of type.containers ?? []) {
              if (c.type === "Group") {
                groups.set(c.id, { parentId: c.parent?.id ?? null, sortOrder: c.sortOrder ?? 0 });
              }
            }
          }
          this._groups = groups;
        },
        "propNavGroups",
      );
    });
  }

  #onSearch = (e) => {
    this._filter = (e.target.value ?? "").toLowerCase();
  };

  #clearFilter = () => {
    this._filter = "";
  };

  // Container id (a tab, or a group on a tab) → its Tab (for sort order, headings and navigation).
  #tabByContainer() {
    const map = new Map();
    for (const tab of this._tabs) {
      for (const tabId of tab.ids ?? []) {
        map.set(tabId, tab);
      }
    }
    for (const [groupId, group] of this._groups) {
      const tab = map.get(group.parentId);
      if (tab) map.set(groupId, tab);
    }
    return map;
  }

  // Where a property sits within its tab: fields directly on the tab first, then by group order.
  #groupOrderOf(property) {
    return this._groups.get(property.container?.id)?.sortOrder ?? -1;
  }

  // Filtered (name, plus alias/description only when shown) then sorted by tab, then by field sortOrder.
  #filtered() {
    const { enableSearch, showAliases, showDescriptions } = this._config;
    const f = enableSearch ? this._filter.trim() : "";
    const has = (text) => (text ?? "").toLowerCase().includes(f);
    const matches = !f
      ? this._properties
      : this._properties.filter(
          (p) =>
            has(p.name) ||
            (showAliases && has(p.alias)) ||
            (showDescriptions && has(p.description)),
        );

    const tabByContainer = this.#tabByContainer();
    // Rank tabs rather than comparing sortOrder directly: tabs can share a sortOrder (e.g. from different
    // compositions), and comparing equal values would interleave their fields. The stable sort keeps tied
    // tabs in the order Umbraco lists them.
    const tabRank = new Map(
      [...this._tabs]
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((tab, i) => [tab, i]),
    );
    const orderOf = (p) =>
      tabRank.get(tabByContainer.get(p.container?.id)) ?? Number.MAX_SAFE_INTEGER;
    return [...matches].sort((a, b) => {
      return (
        orderOf(a) - orderOf(b) ||
        this.#groupOrderOf(a) - this.#groupOrderOf(b) ||
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
      );
    });
  }

  // Split the (already tab-ordered) list into consecutive runs per tab for the headings.
  #groups() {
    const tabByContainer = this.#tabByContainer();
    const groups = [];
    let current = null;
    for (const p of this.#filtered()) {
      const label = tabByContainer.get(p.container?.id)?.name ?? "Other";
      if (!current || current.label !== label) {
        current = { label, items: [] };
        groups.push(current);
      }
      current.items.push(p);
    }
    return groups;
  }

  // Route of the sub-tab holding this property, e.g. "/view/content/tab/seo" (plain "/view/content" if no tabs).
  #tabRouteFor(property) {
    const containerId = property?.container?.id;
    const tab = containerId ? this.#tabByContainer().get(containerId) : undefined;
    return tab?.key ? `/view/content/${tab.key}` : "/view/content";
  }

  // Switch to the property's tab, then scroll to and highlight the field.
  #goToProperty(property) {
    // Keep the node's base route (".../edit/{id}/{culture}") and swap whatever follows — "/view/…" or a bare
    // "/tab/…" — for the target route; clicking an <a> keeps it an in-app (no reload) navigation.
    const target = this.#tabRouteFor(property);
    const path = window.location.pathname;
    const base = path.match(/^.*?\/edit\/[^/]+\/[^/]+/)?.[0];
    const viewIdx = path.indexOf("/view/");
    const nodeUrl = base ?? (viewIdx === -1 ? path : path.slice(0, viewIdx));

    // ".../tab/x" and ".../view/content/tab/x" show the same tab, but switching between them re-renders it
    // (and resets the scroll), so don't navigate when we're already on the target tab.
    const tabOf = (route) => route.replace(/^\/view\/content(?=\/|$)/, "");
    const onTargetTab = tabOf(path.slice(nodeUrl.length)) === tabOf(target);

    // A re-render replaces the field element, so remember the current one to avoid scrolling to it.
    const selector = `umb-property[data-mark="property:${property.alias}"]`;
    const stale = onTargetTab ? null : deepQuery(selector);

    if (!onTargetTab) {
      const a = document.createElement("a");
      a.href = nodeUrl + target;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    this._onNavigated();

    // The tab renders its fields after navigating, so poll (every 50ms, up to ~2s) for the field.
    let tries = 0;
    const tick = () => {
      const found = deepQuery(selector);
      // Skip the pre-navigation element while it might still be swapped out (~500ms); after that it's the real one.
      const el = found && (found !== stale || tries >= 10) ? found : null;
      if (el) {
        const scrollToTarget = () =>
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        // Editors above it keep growing as they lay out, so re-centre a couple of times.
        scrollToTarget();
        setTimeout(scrollToTarget, 250);
        setTimeout(scrollToTarget, 600);
        // The ring rides along with the field, so on the same tab show it straight away; after a tab switch,
        // wait for the fields to finish laying out.
        if (this._config.highlightField) {
          setTimeout(() => flashProperty(el), onTargetTab ? 0 : 350);
        }
        return;
      }
      if (tries++ < 40) setTimeout(tick, 50);
      else console.warn("[PropNav] could not find", selector);
    };
    // Already on the tab: the field is there now. Otherwise give the tab a moment to start rendering.
    if (onTargetTab) tick();
    else setTimeout(tick, 50);
  }

  // Hook for subclasses, called right after a jump starts (the dropdown closes itself).
  _onNavigated() {}

  // Wrap each match of the filter text in <mark> so you can see why a row matched.
  #highlight(text) {
    const value = text ?? "";
    const f = this._filter.trim();
    if (!f) return value;
    const lower = value.toLowerCase();
    const parts = [];
    let i = 0;
    for (let idx = lower.indexOf(f, i); idx !== -1; idx = lower.indexOf(f, i)) {
      if (idx > i) parts.push(value.slice(i, idx));
      parts.push(html`<mark>${value.slice(idx, idx + f.length)}</mark>`);
      i = idx + f.length;
    }
    parts.push(value.slice(i));
    return parts;
  }

  // The filter box; its placeholder names only what the filter can match with the current config.
  #renderSearch() {
    const { showAliases, showDescriptions } = this._config;
    const fields = ["name", showAliases && "alias", showDescriptions && "description"]
      .filter(Boolean);
    const placeholder =
      fields.length === 1
        ? "Filter by name…"
        : `Filter by ${fields.slice(0, -1).join(", ")} or ${fields.at(-1)}…`;
    return html`
      <uui-input
        type="text"
        label="Filter properties"
        placeholder=${placeholder}
        .value=${this._filter}
        @input=${this.#onSearch}
        style="width: 100%; margin-bottom: var(--uui-size-6);"
      >
        <uui-icon name="search" slot="prepend" class="search-icon"></uui-icon>
        ${this._filter
          ? html`<uui-button
              slot="append"
              compact
              label="Clear filter"
              style="height: 100%;"
              @click=${this.#clearFilter}
            >
              <uui-icon name="remove"></uui-icon>
            </uui-button>`
          : ""}
      </uui-input>
    `;
  }

  // The search box plus the grouped results; subclasses wrap this in their own container.
  renderNavigator() {
    const { enableSearch, showAliases, showDescriptions } = this._config;
    const groups = this.#groups();
    return html`
      ${enableSearch ? this.#renderSearch() : ""}
      ${groups.length === 0
        ? html`<p>No matching properties.</p>`
        : groups.map(
            (g) => html`
              <div class="tab-group">
                <h4 class="tab-heading">${g.label}</h4>
                ${g.items.map(
                  (p) => html`
                    <uui-menu-item
                      label=${p.name}
                      @click-label=${() => this.#goToProperty(p)}
                    >
                      <span slot="label" class="prop-label">
                        <span class="prop-line">
                          <strong>${this.#highlight(p.name)}</strong>
                          ${showAliases
                            ? html`— <code>${this.#highlight(p.alias)}</code>`
                            : ""}
                        </span>
                        ${showDescriptions && p.description
                          ? html`<span class="prop-desc"
                              >${this.#highlight(p.description)}</span
                            >`
                          : ""}
                      </span>
                    </uui-menu-item>
                  `,
                )}
              </div>
            `,
          )}
    `;
  }

  // List styles shared by subclasses (combine via `static styles = [PropertyNavigatorBase.coreStyles, …]`).
  static coreStyles = css`
    .tab-group {
      margin-bottom: var(--uui-size-7);
    }
    .tab-heading {
      margin: 0 0 var(--uui-size-1);
      padding-bottom: var(--uui-size-1);
      border-bottom: 2px solid var(--uui-color-divider);
      font-size: var(--uui-size-4);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--uui-color-text-alt);
    }
    uui-menu-item {
      --uui-menu-item-flat-structure: 1; /* no caret column: the list is flat */
    }
    /* uui-menu-item keeps its label on one line; let long names and descriptions wrap instead. */
    .prop-label {
      display: block;
      min-width: 0;
      white-space: normal;
      overflow-wrap: anywhere; /* long URLs in descriptions would otherwise be clipped by the item */
      padding: var(--uui-size-2) 0;
    }
    .prop-desc {
      display: block;
      margin-top: var(--uui-size-1);
      font-size: var(--uui-size-4);
      color: var(--uui-color-text-alt);
    }
    code {
      font-family: monospace;
      color: var(--uui-color-interactive);
    }
    mark {
      background: var(--uui-color-current, #fdf0c8);
      color: inherit;
      border-radius: 2px;
      padding: 0 1px;
    }
    .search-icon {
      padding-left: var(--uui-size-space-3);
      color: var(--uui-color-text-alt);
    }
  `;
}
