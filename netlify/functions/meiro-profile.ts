const DEFAULT_PROFILE_API_ENDPOINT = "https://meiro-demo.eu.pipes.meiro.io/profile-api/web-perso";
const ALLOWED_IDENTIFIER_TYPES = new Set(["user_id", "email", "phone", "device_id", "browser"]);

declare const Netlify: { env?: { get?: (key: string) => string | undefined } } | undefined;
declare const process: { env?: Record<string, string | undefined> } | undefined;

export default async (req: Request) => {
  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  const token = getEnv("MEIRO_PROFILE_API_TOKEN") || getEnv("VITE_MEIRO_PROFILE_API_TOKEN");
  if (!token) {
    return json({ error: "Missing MEIRO_PROFILE_API_TOKEN", code: "missing_profile_api_token" }, 500);
  }

  const inboundUrl = new URL(req.url);
  const identifierType = inboundUrl.searchParams.get("identifier_type") || "user_id";
  const identifierValue = inboundUrl.searchParams.get("identifier_value") || "";

  if (!ALLOWED_IDENTIFIER_TYPES.has(identifierType)) {
    return json({ error: "Unsupported identifier_type" }, 400);
  }

  if (!identifierValue) {
    return json({ error: "Missing identifier_value" }, 400);
  }

  const endpoint = getEnv("MEIRO_PROFILE_API_ENDPOINT") || getEnv("VITE_MEIRO_PROFILE_API_ENDPOINT") || DEFAULT_PROFILE_API_ENDPOINT;
  const outboundUrl = new URL(endpoint);
  outboundUrl.searchParams.set("identifier_type", identifierType);
  outboundUrl.searchParams.set("identifier_value", identifierValue);

  try {
    const response = await fetch(outboundUrl, {
      headers: {
        "X-API-Token": token,
      },
    });

    const body = await response.text();

    if (!response.ok) {
      return json({
        error: `Meiro Profile API returned ${response.status}`,
        code: "upstream_profile_api_error",
        upstream_status: response.status,
        upstream_body: body.slice(0, 500),
      }, response.status);
    }

    return new Response(body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return json({
      error: "Meiro Profile API request failed",
      code: "profile_api_proxy_fetch_failed",
      message: error instanceof Error ? error.message : "Unknown fetch error",
    }, 502);
  }
};

export const config = {
  path: "/api/meiro-profile",
};

function json(payload: Record<string, unknown>, status: number) {
  return Response.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function getEnv(key: string) {
  const netlifyValue = typeof Netlify !== "undefined" ? Netlify.env?.get?.(key) : undefined;
  const processValue = typeof process !== "undefined" ? process.env?.[key] : undefined;
  return netlifyValue || processValue;
}
