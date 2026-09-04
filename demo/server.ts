import { ConsoleNER, regexPattern } from "../src/index";

type DemoTag =
  | "case_reference"
  | "ip_address"
  | "loan_number"
  | "organization"
  | "payment_card"
  | "postal_address"
  | "routing_number";

interface DemoMetadata {
  assistance?: string;
  evidence?: string;
}

interface RequestStats {
  checks: number;
}

interface MockServices {
  stats: RequestStats;
  verify(kind: DemoTag, value: string): Promise<boolean>;
}

const knownLoans = new Set(["8041234567", "8058675309"]);
const knownCases = new Set(["CN-2026-004218", "CN-2026-001337"]);
const knownOrganizations = new Set([
  "northstar analytics llc",
  "contoso capital",
  "fabrikam systems inc",
]);

function digits(value: string): string {
  return value.replace(/\D/g, "");
}

function passesLuhn(value: string): boolean {
  const sequence = digits(value);
  if (sequence.length < 13 || sequence.length > 19 || /^(\d)\1+$/.test(sequence)) return false;
  let sum = 0;
  let double = false;
  for (let index = sequence.length - 1; index >= 0; index--) {
    let digit = Number(sequence[index]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

function passesRoutingChecksum(value: string): boolean {
  const sequence = digits(value);
  if (sequence.length !== 9) return false;
  const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1];
  return [...sequence].reduce((sum, digit, index) => sum + Number(digit) * (weights[index] ?? 0), 0) % 10 === 0;
}

function isValidIp(value: string): boolean {
  const octets = value.split(".").map(Number);
  return octets.length === 4 && octets.every((octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255);
}

function isValidIllinoisAddress(value: string): boolean {
  const match = value.match(/,\s*([A-Z]{2})\s+(\d{5})(?:-\d{4})?$/i);
  if (!match) return false;
  const state = match[1]?.toUpperCase();
  const zip = match[2] ?? "";
  return state === "IL" && /^(?:60|61|62)/.test(zip);
}

function createServices(stats: RequestStats): MockServices {
  return {
    stats,
    async verify(kind, value) {
      stats.checks += 1;
      await Bun.sleep(18 + (value.length % 4) * 5);
      switch (kind) {
        case "loan_number": return knownLoans.has(digits(value));
        case "case_reference": return knownCases.has(value.toUpperCase());
        case "organization": return knownOrganizations.has(value.replace(/\.$/, "").toLowerCase());
        case "payment_card": return passesLuhn(value);
        case "routing_number": return passesRoutingChecksum(value);
        case "ip_address": return isValidIp(value);
        case "postal_address": return isValidIllinoisAddress(value);
      }
    },
  };
}

const serverNER = new ConsoleNER<DemoTag, MockServices, DemoMetadata>({
  contextWindow: 100,
  validationConcurrency: 6,
  defaultValidatorThreshold: 1,
});

function assistedPattern(options: {
  id: string;
  tag: DemoTag;
  regex: RegExp;
  confidence: number;
  normalize?: (value: string) => string;
  evidence: string;
}) {
  return regexPattern<DemoTag, DemoMetadata, MockServices>({
    id: options.id,
    tag: options.tag,
    regex: options.regex,
    confidence: options.confidence,
    normalize: options.normalize,
    metadata: () => ({ assistance: "mock-server", evidence: options.evidence }),
    validator: {
      id: `${options.id}:mock-validator`,
      runBelowConfidence: 1,
      async validate(entity, context) {
        const valid = await context.services.verify(options.tag, entity.normalizedValue);
        return {
          valid,
          confidence: valid ? Math.max(.96, entity.confidence) : .05,
          metadata: { evidence: valid ? options.evidence : "Mock validation rejected the candidate" },
        };
      },
    },
  });
}

serverNER.register([
  assistedPattern({
    id: "server-loan-directory",
    tag: "loan_number",
    regex: /\b80[4-9]\d{7}\b/g,
    confidence: .76,
    normalize: digits,
    evidence: "Matched the mock loan directory",
  }),
  assistedPattern({
    id: "server-case-directory",
    tag: "case_reference",
    regex: /\bCN-\d{4}-\d{6}\b/gi,
    confidence: .7,
    normalize: (value) => value.toUpperCase(),
    evidence: "Matched the mock case directory",
  }),
  assistedPattern({
    id: "server-organization-directory",
    tag: "organization",
    regex: /\b(?:[A-Z][\p{L}\d&'.-]*\s+){1,4}(?:Analytics|Bank|Capital|Company|Corp\.?|Corporation|Holdings|Labs?|LLC|Systems|Inc\.?)\b/gu,
    confidence: .64,
    normalize: (value) => value.replace(/\.$/, ""),
    evidence: "Matched the mock organization directory",
  }),
  assistedPattern({
    id: "server-payment-luhn",
    tag: "payment_card",
    regex: /(?<!\d)(?:\d[ -]?){12,18}\d(?!\d)/g,
    confidence: .58,
    normalize: digits,
    evidence: "Passed the Luhn checksum",
  }),
  assistedPattern({
    id: "server-routing-checksum",
    tag: "routing_number",
    regex: /(?<!\d)\d{9}(?!\d)/g,
    confidence: .6,
    normalize: digits,
    evidence: "Passed the ABA routing checksum",
  }),
  assistedPattern({
    id: "server-ip-octets",
    tag: "ip_address",
    regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    confidence: .66,
    evidence: "All IPv4 octets are in range",
  }),
  assistedPattern({
    id: "server-us-address",
    tag: "postal_address",
    regex: /\b\d{1,6}\s+(?:[NSEW]\.?(?:\s+|$))?(?:[A-Z][\p{L}'-]*\s+){1,4}(?:St(?:reet)?|Ave(?:nue)?|Blvd|Boulevard|Rd|Road|Dr|Drive|Ln|Lane)\.?,?\s+[A-Z][\p{L}'-]*(?:\s+[A-Z][\p{L}'-]*)*,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/gu,
    confidence: .62,
    normalize: (value) => value.replace(/\s+/g, " ").trim(),
    evidence: "State and ZIP combination passed mock address validation",
  }),
]);

const corsHeaders = {
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

// The development script combines Bun's server reload with browser polling.
const liveReloadEnabled = Bun.argv.includes("--live-reload");
const liveReloadInstance = crypto.randomUUID();
const demoFileUrl = new URL("./index.html", import.meta.url);

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: corsHeaders });
}

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: Number(Bun.env.PORT ?? 4173),
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (request.method === "GET" && url.pathname === "/__demo_version") {
      return Response.json({
        enabled: liveReloadEnabled,
        version: liveReloadEnabled
          ? `${liveReloadInstance}:${Bun.file(demoFileUrl).lastModified}`
          : null,
      }, {
        headers: { ...corsHeaders, "Cache-Control": "no-store" },
      });
    }
    if (request.method === "GET" && url.pathname === "/api/health") {
      return json({ ok: true, service: "console-ner-demo", mode: "mock" });
    }
    if (request.method === "POST" && url.pathname === "/api/recognize") {
      const started = performance.now();
      try {
        const body = await request.json() as { text?: unknown };
        if (typeof body.text !== "string") return json({ error: "Expected a text string" }, 400);
        if (body.text.length > 100_000) return json({ error: "Text is limited to 100,000 characters" }, 413);

        const stats: RequestStats = { checks: 0 };
        const result = await serverNER.recognizeAsync(body.text, { services: createServices(stats) });
        const entities = result.entities
          .filter((entity) => entity.validation?.status === "valid")
          .map((entity) => ({ ...entity, assisted: true, source: "server" }));

        return json({
          entities,
          stats: {
            checks: stats.checks,
            yielded: entities.length,
            rejected: Math.max(0, stats.checks - entities.length),
            latencyMs: Number((performance.now() - started).toFixed(1)),
          },
          service: "ConsoleNER mock validation API",
        });
      } catch {
        return json({ error: "Invalid JSON request" }, 400);
      }
    }
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      return new Response(Bun.file(demoFileUrl), {
        headers: {
          "Cache-Control": liveReloadEnabled ? "no-store" : "no-cache",
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }
    return json({ error: "Not found" }, 404);
  },
});

console.log(`ConsoleNER demo: http://${server.hostname}:${server.port}`);
console.log(`Mock NER API:    http://${server.hostname}:${server.port}/api/recognize`);
if (liveReloadEnabled) console.log("Live reload:     enabled");
