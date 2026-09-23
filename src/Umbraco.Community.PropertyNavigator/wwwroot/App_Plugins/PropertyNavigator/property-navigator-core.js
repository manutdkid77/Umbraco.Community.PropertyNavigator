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
    _config: { state: true },
  };

  #workspace; // the document workspace context, once consumed

  constructor() {
    super();

    this._properties = [];
    this._filter = "";
    this._tabs = [];
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

      // The Tabs; each lists the group `ids` merged into it, which maps a property back to its tab.
      this.observe(
        context.structure.contentTypeMergedContainers,
        (containers) => {
          this._tabs = (containers ?? []).filter((c) => c.type === "Tab");
        },
        "propNavContainers",
      );
    });
  }

  #onSearch = (e) => {
    this._filter = (e.target.value ?? "").toLowerCase();
  };

  #clearFilter = () => {
    this._filter = "";
  };

  // Group id → its Tab (for sort order, headings and navigation).
  #tabByGroup() {
    const map = new Map();
    for (const tab of this._tabs) {
      for (const groupId of tab.ids ?? []) {
        map.set(groupId, tab);
      }
    }
    return map;
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

    const tabByGroup = this.#tabByGroup();
    const orderOf = (p) =>
      tabByGroup.get(p.container?.id)?.sortOrder ?? Number.MAX_SAFE_INTEGER;
    return [...matches].sort((a, b) => {
      return orderOf(a) - orderOf(b) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });
  }

  // Split the (already tab-ordered) list into consecutive runs per tab for the headings.
  #groups() {
    const tabByGroup = this.#tabByGroup();
    const groups = [];
    let current = null;
    for (const p of this.#filtered()) {
      const label = tabByGroup.get(p.container?.id)?.name ?? "Other";
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
    const groupId = property?.container?.id;
    const tab = groupId
      ? this._tabs.find((t) => Array.isArray(t.ids) && t.ids.includes(groupId))
      : undefined;
    return tab?.key ? `/view/content/${tab.key}` : "/view/content";
  }

  // Switch to the property's tab, then scroll to and highlight the field.
  #goToProperty(property) {
    // Swap everything from "/view/" for the target route; clicking an <a> keeps it an in-app (no reload) navigation.
    const target = this.#tabRouteFor(property);
    const path = window.location.pathname;
    const viewIdx = path.indexOf("/view/");
    const contentUrl = (viewIdx === -1 ? path : path.slice(0, viewIdx)) + target;
    const a = document.createElement("a");
    a.href = contentUrl;
    document.body.appendChild(a);
    a.click();
    a.remove();

    this._onNavigated();

    // The tab renders its fields after navigating, so poll (every 50ms, up to ~2s) for the field.
    const selector = `umb-property[data-mark="property:${property.alias}"]`;
    let tries = 0;
    const tick = () => {
      const el = deepQuery(selector);
      if (el) {
        const scrollToTarget = () =>
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        // Editors above it keep growing as they lay out, so re-centre a couple of times.
        scrollToTarget();
        setTimeout(scrollToTarget, 250);
        setTimeout(scrollToTarget, 600);
        // Flash once the smooth scroll has mostly settled.
        setTimeout(() => flashProperty(el), 350);
        return;
      }
      if (tries++ < 40) setTimeout(tick, 50);
      else console.warn("[PropNav] could not find", selector);
    };
    setTimeout(tick, 50);
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
        type="search"
        label="Filter properties"
        placeholder=${placeholder}
        .value=${this._filter}
        @input=${this.#onSearch}
        style="width: 100%; margin-bottom: var(--uui-size-6);"
      >
        ${this._filter
          ? html`<button
              slot="append"
              type="button"
              class="clear-btn"
              title="Clear filter"
              aria-label="Clear filter"
              @click=${this.#clearFilter}
            >
              ✕
            </button>`
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
                <ul>
                  ${g.items.map(
                    (p) => html`
                      <li>
                        <button
                          type="button"
                          @click=${() => this.#goToProperty(p)}
                        >
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
                        </button>
                      </li>
                    `,
                  )}
                </ul>
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
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    li {
      border-bottom: 1px solid var(--uui-color-divider);
    }
    li button {
      width: 100%;
      text-align: left;
      cursor: pointer;
      font: inherit;
      color: inherit;
      background: none;
      border: none;
      padding: var(--uui-size-3) var(--uui-size-2);
    }
    li button:hover {
      background: var(--uui-color-surface-alt);
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
    .clear-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 0 var(--uui-size-3);
      cursor: pointer;
      border: none;
      background: none;
      font-size: var(--uui-size-4);
      line-height: 1;
      color: var(--uui-color-text-alt);
    }
    .clear-btn:hover {
      color: var(--uui-color-text);
    }
  `;
}
