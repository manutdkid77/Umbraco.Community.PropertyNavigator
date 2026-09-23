// Loads the PropertyNavigator appsettings from the package's Management API endpoint, once per page.
// Uses plain fetch + the backoffice token: umbHttpClient would send no auth here and turn the 401 into a forced re-login.

import { UMB_AUTH_CONTEXT } from "@umbraco-cms/backoffice/auth";

const CONFIG_PATH = "/umbraco/management/api/v1/property-navigator/config";

// Mirrors PropertyNavigatorOptions' defaults; used until the config arrives or if it fails.
export const DEFAULT_CONFIG = Object.freeze({
  enabled: true,
  enableSearch: true,
  showDescriptions: false,
  showAliases: false,
});

let pending;

// Shared promise of the merged config; never rejects (falls back to the defaults).
export function getPropertyNavigatorConfig(host) {
  pending ??= loadConfig(host).catch((err) => {
    console.warn("[PropNav] couldn't load config, using defaults", err);
    pending = undefined; // let a later call retry
    return DEFAULT_CONFIG;
  });
  return pending;
}

async function loadConfig(host) {
  const authContext = await host.getContext(UMB_AUTH_CONTEXT);
  if (!authContext) throw new Error("no auth context");
  // In v17 token() is a placeholder the server swaps for the secure auth cookie, hence `credentials` too.
  const { base, credentials, token } = authContext.getOpenApiConfiguration();

  const response = await fetch(`${base ?? ""}${CONFIG_PATH}`, {
    headers: { Authorization: `Bearer ${await token()}` },
    credentials,
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return { ...DEFAULT_CONFIG, ...(await response.json()) };
}
