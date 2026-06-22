export type MeiroConfigStatus = {
  sdkEnabled: boolean;
  debug: boolean;
  hasEndpoint: boolean;
  hasScriptUrl: boolean;
  endpoint: string;
  scriptUrl: string;
  mode: "mock" | "configured" | "incomplete";
};

export const DEFAULT_MEIRO_ENDPOINT = "https://meiro-demo.eu.pipes.meiro.io/collect/web-sdk";
export const DEFAULT_MEIRO_SCRIPT_URL = "https://meiro-demo.eu.pipes.meiro.io/mpt.js";

export function getMeiroEndpoint() {
  return import.meta.env.VITE_MEIRO_ENDPOINT || DEFAULT_MEIRO_ENDPOINT;
}

export function getMeiroScriptUrl() {
  return import.meta.env.VITE_MEIRO_SCRIPT_URL || DEFAULT_MEIRO_SCRIPT_URL;
}

export function getMeiroConfigStatus(): MeiroConfigStatus {
  const sdkEnabled = import.meta.env.VITE_MEIRO_SDK_ENABLED === "true";
  const endpoint = getMeiroEndpoint();
  const scriptUrl = getMeiroScriptUrl();
  const hasEndpoint = Boolean(endpoint);
  const hasScriptUrl = Boolean(scriptUrl);
  const configured = hasEndpoint && hasScriptUrl;

  return {
    sdkEnabled,
    debug: import.meta.env.VITE_MEIRO_DEBUG !== "false",
    hasEndpoint,
    hasScriptUrl,
    endpoint,
    scriptUrl,
    mode: !sdkEnabled ? "mock" : configured ? "configured" : "incomplete",
  };
}
