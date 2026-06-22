const DEFAULT_PROFILE_API_ENDPOINT = "https://meiro-demo.eu.pipes.meiro.io/profile-api/web-perso";
const ALLOWED_IDENTIFIER_TYPES = new Set(["user_id", "email", "phone", "device_id", "browser"]);

export default async (req: Request) => {
  if (req.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  const token = Netlify.env.get("MEIRO_PROFILE_API_TOKEN");
  if (!token) {
    return json({ error: "Missing MEIRO_PROFILE_API_TOKEN" }, 500);
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

  const endpoint = Netlify.env.get("MEIRO_PROFILE_API_ENDPOINT") || DEFAULT_PROFILE_API_ENDPOINT;
  const outboundUrl = new URL(endpoint);
  outboundUrl.searchParams.set("identifier_type", identifierType);
  outboundUrl.searchParams.set("identifier_value", identifierValue);

  const response = await fetch(outboundUrl, {
    headers: {
      "X-API-Token": token,
    },
  });

  const body = await response.text();

  return new Response(body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") || "application/json",
      "Cache-Control": "no-store",
    },
  });
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
