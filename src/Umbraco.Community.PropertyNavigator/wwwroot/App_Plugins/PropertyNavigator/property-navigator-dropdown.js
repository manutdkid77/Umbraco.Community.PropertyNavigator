// Property Navigator dropdown: clicking the already-active Content view opens the navigator beneath it (like v13).
// Registered as a workspaceFooterApp purely so it lives inside the document workspace; it renders nothing visible itself.

import { html, css } from "@umbraco-cms/backoffice/external/lit";
import { PropertyNavigatorBase } from "./property-navigator-core.js";

// The core "Content" workspace view tab rendered by umb-workspace-editor.
const CONTENT_TAB_SELECTOR =
  'uui-tab[data-mark="workspace:view-link:Umb.WorkspaceView.Document.Edit"]';

const GAP = 4; // px between the tab and the panel
const EDGE = 8; // min px kept from the viewport edges

export class PropertyNavigatorDropdownElement extends PropertyNavigatorBase {
  #listenRoot; // shadow root shared by the workspace footer and the editor's view tabs
  #wasOpenOnPointerDown = false;

  connectedCallback() {
    super.connectedCallback();
    // Delegated listeners survive tab re-renders and stay scoped to this workspace.
    this.#listenRoot = this.#findWorkspaceRoot();
    this.#listenRoot?.addEventListener("pointerdown", this.#onPointerDown, true);
    this.#listenRoot?.addEventListener("click", this.#onClick, true);
  }

  disconnectedCallback() {
    this.#listenRoot?.removeEventListener("pointerdown", this.#onPointerDown, true);
    this.#listenRoot?.removeEventListener("click", this.#onClick, true);
    this.#listenRoot = undefined;
    super.disconnectedCallback();
  }

  // Walk up the shadow hosts to the root that contains umb-workspace-footer (it also holds the view tabs).
  #findWorkspaceRoot() {
    let root = this.getRootNode();
    while (root instanceof ShadowRoot) {
      const host = root.host;
      if (host.localName === "umb-workspace-footer") return host.getRootNode();
      root = host.getRootNode();
    }
    return undefined;
  }

  // The Content tab this event came from, if it's the active view and the package is enabled (and its config loaded).
  #contentTabFrom(e) {
    if (!this._configLoaded || !this._config.enabled) return undefined;
    const tab = e.composedPath().find((n) => n instanceof Element && n.matches(CONTENT_TAB_SELECTOR));
    return tab?.active ? tab : undefined;
  }

  // The popover light-dismisses on pointerdown, so remember if it was open to make a 2nd click close it.
  #onPointerDown = (e) => {
    if (this.#contentTabFrom(e)) this.#wasOpenOnPointerDown = this.#isOpen();
  };

  // On the active Content tab: cancel the same-route navigation and toggle the panel instead.
  #onClick = (e) => {
    const tab = this.#contentTabFrom(e);
    if (!tab) return;
    e.preventDefault();
    e.stopPropagation();
    const wasOpen = this.#wasOpenOnPointerDown || this.#isOpen();
    this.#wasOpenOnPointerDown = false;
    if (wasOpen) this.#close();
    else this.#openBelow(tab);
  };

  #panel() {
    return this.renderRoot?.querySelector(".popover-panel");
  }

  #isOpen() {
    return this.#panel()?.matches(":popover-open") ?? false;
  }

  #close() {
    this.#panel()?.hidePopover?.();
  }

  // Position the panel under the tab, right-aligned, clamped to the viewport.
  #openBelow(anchor) {
    const panel = this.#panel();
    if (!panel?.showPopover) return;
    const r = anchor.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;

    const width = Math.min(360, vw - EDGE * 2);
    panel.style.width = `${width}px`;
    panel.style.left = `${Math.max(EDGE, Math.min(r.right - width, vw - width - EDGE))}px`;
    panel.style.top = `${r.bottom + GAP}px`;
    panel.style.maxHeight = `${Math.min(vh * 0.6, vh - r.bottom - GAP - EDGE)}px`;

    panel.showPopover();
  }

  // Close after a jump so the panel doesn't cover the field we navigated to.
  _onNavigated() {
    this.#close();
  }

  // On open: scroll back to the top and focus the search box.
  #onToggle = (e) => {
    if (e.newState !== "open") return;
    const panel = this.#panel();
    if (panel) panel.scrollTop = 0;
    panel?.querySelector("uui-input")?.focus?.();
  };

  render() {
    return html`
      <div class="popover-panel" popover="auto" @toggle=${this.#onToggle}>
        ${this.renderNavigator()}
      </div>
    `;
  }

  static styles = [
    PropertyNavigatorBase.coreStyles,
    css`
      :host {
        display: contents; /* takes no space in the footer */
      }
      .popover-panel {
        position: fixed; /* placed by #openBelow(); resets the UA's centred popover */
        inset: auto;
        margin: 0;
        box-sizing: border-box;
        overflow-y: auto;
        overflow-x: hidden; /* uui-input pokes a few px past the content box */
        padding: var(--uui-size-space-4);
        color: var(--uui-color-text);
        background: var(--uui-color-surface);
        border: 1px solid var(--uui-color-border);
        border-radius: var(--uui-border-radius);
        box-shadow: var(--uui-shadow-depth-3);
      }
    `,
  ];
}

customElements.define("property-navigator-dropdown", PropertyNavigatorDropdownElement);
export default PropertyNavigatorDropdownElement;
