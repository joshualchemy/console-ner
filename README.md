# ConsoleNER

ConsoleNER is a small, deterministic-first named entity recognition and tokenization library for TypeScript. It finds entities synchronously with registered regular expressions or custom matchers, then optionally validates uncertain results with application-provided async functions.

It is framework agnostic, has no runtime dependencies, works in modern browsers and Node.js/Bun, and makes no assumptions about HTTP clients, databases, or backend architecture.

> Recognize locally. Trust high-confidence matches. Validate uncertainty. Enrich progressively.

## Installation

```sh
npm install console-ner
# or: bun add console-ner
```

## Quick start

```ts
import { ConsoleNER, emailPattern } from "console-ner";

type Tag = "email" | "loan_number";

const ner = new ConsoleNER<Tag>();

ner.register([
  emailPattern(),
  {
    id: "loan-number",
    tag: "loan_number",
    pattern: /\b80[4-9]\d{7}\b/g,
    confidence: 0.98,
  },
]);

const result = ner.recognize(
  "Email john@example.com about loan 8041234567.",
);

result.entities[0];
// {
//   id: "email:6:22:builtin-email",
//   tag: "email",
//   value: "john@example.com",
//   normalizedValue: "john@example.com",
//   start: 6,
//   end: 22,
//   confidence: 0.99,
//   source: "pattern",
//   patternId: "builtin-email",
//   validation: { status: "not_requested" }
// }
```

Entity ranges are always `[start, end)` JavaScript string indexes, so `result.text.slice(entity.start, entity.end) === entity.value`.

## Patterns and tags

Tags are arbitrary strings. Give the class a string union to check tags throughout registration, entities, and validators.

```ts
type Tag = "email" | "phone" | "document_type";
const ner = new ConsoleNER<Tag>();

ner.register({ tag: "email", pattern: /\S+@\S+\.\S+/g });
ner.register([
  { id: "phone-us", tag: "phone", pattern: /\d{3}-\d{3}-\d{4}/g },
  { id: "phone-intl", tag: "phone", pattern: /\+\d[\d -]{7,}/g },
]);

ner.disablePattern("phone-us");
ner.enablePattern("phone-us");
ner.unregisterPattern("phone-intl");
ner.unregisterTag("phone");
ner.clear();
```

Multiple patterns can share a tag. Explicit pattern IDs are recommended; otherwise stable instance-local IDs such as `pattern-0` are assigned. Registering a duplicate ID throws.

Limit a recognition pass without changing the registry:

```ts
ner.recognize(text, { tags: ["email"] });
ner.recognize(text, { excludeTags: ["phone"] });
```

### Regex patterns

Global and non-global regexes both find every occurrence. ConsoleNER clones regexes for each scan, so caller-owned `lastIndex` is never changed and repeated recognition is deterministic.

```ts
import { regexPattern } from "console-ner";

ner.register(regexPattern<Tag>({
  id: "email-simple",
  tag: "email",
  regex: /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/gi,
  confidence: 0.95,
}));
```

Empty and invalid spans are ignored.

### Custom matchers

A matcher can use a dictionary, trie, tokenizer, or any other synchronous algorithm. It returns an iterable of raw matches.

```ts
import type { PatternMatcher } from "console-ner";

const matcher: PatternMatcher<{ category: string }> = (text) => {
  const phrase = "bank statements";
  const start = text.toLowerCase().indexOf(phrase);
  if (start < 0) return [];

  return [{
    value: text.slice(start, start + phrase.length),
    start,
    end: start + phrase.length,
    normalizedValue: "bank_statement",
    confidence: 0.96,
    metadata: { category: "financial" },
  }];
};

ner.register({ tag: "document_type", pattern: matcher });
```

Custom matches must provide a valid non-empty range and a `value` equal to the source slice. Invalid matches are ignored so the entity position invariant is preserved.

## Normalization, context, and metadata

The source `value` is never replaced. A pattern may derive a normalized value and metadata while seeing a bounded text window.

```ts
const phones = new ConsoleNER<"phone", undefined, { format: string }>({
  contextWindow: 80, // default: 100
});

phones.register({
  tag: "phone",
  pattern: /\(\d{3}\) \d{3}-\d{4}/g,
  normalize: (value, context) => `+1${value.replace(/\D/g, "")}`,
  metadata: () => ({ format: "us" }),
});
```

`MatchContext` contains `text`, `start`, `end`, `before`, and `after`. Match-provided normalization and confidence override pattern values. Metadata is shallow-merged in this order, with later keys winning:

1. Pattern metadata callback
2. Match metadata
3. Entity validator metadata
4. Any entity objects returned by global validation

## Confidence

Every confidence value and validator threshold is clamped to `0..1`. Non-finite values become `0`. The default initial confidence is `0.5` and can be configured with `defaultConfidence`.

Precedence is deliberately simple:

1. Pattern confidence (number or resolver)
2. Match confidence
3. Entity validator confidence
4. Entity confidence returned by global validation

```ts
import { clampConfidence } from "console-ner";

clampConfidence(1.4); // 1
clampConfidence(-0.2); // 0
```

## Progressive async validation

Recognition is always synchronous and never invokes validators. Validation returns a new result and new entity objects; the earlier result remains available for immediate rendering.

```ts
const initial = ner.recognize(text);
render(initial.entities);

const final = await ner.validate(initial);
render(final.entities);

// Convenience form using the same pipeline:
const samePipeline = await ner.recognizeAsync(text);
```

Validation order is fixed:

```text
detection → normalization → initial confidence → overlap resolution
          → eligible entity validators → updated confidence
          → fresh global threshold decision → eligible global validator
```

### Entity validators and thresholds

An entity validator belongs to one pattern. It runs only when the entity's current confidence is strictly below `runBelowConfidence`.

```ts
interface Services {
  loanExists(value: string): Promise<boolean>;
  resolveContext(input: unknown): Promise<unknown>;
}

const loans = new ConsoleNER<"loan_number", Services>({
  defaultValidatorThreshold: 1,
});

loans.register({
  id: "loan-number",
  tag: "loan_number",
  pattern: /\b80[4-9]\d{7}\b/g,
  confidence: 0.98,
  validator: {
    id: "confirm-loan",
    runBelowConfidence: 1,
    async validate(entity, context) {
      const exists = await context.services.loanExists(entity.normalizedValue);
      return {
        valid: exists,
        confidence: exists ? 1 : 0.1,
        metadata: { checked: true },
      };
    },
  },
});

const validated = await loans.validate(loans.recognize("8041234567"), {
  services,
});
```

Threshold comparison uses strict-below semantics:

| Confidence | Threshold | Outcome |
| ---: | ---: | --- |
| `0.79` | `0.80` | run |
| `0.80` | `0.80` | skip |
| `0.81` | `0.80` | skip |

The default threshold is `1`, meaning anything below perfect confidence is eligible. A skipped entity exposes `validation: { status: "skipped", reason: "confidence_threshold" }`. Invalid results remain visible, receive status `invalid`, and default to confidence `0` unless the validator supplies another score.

### Global validator

The optional instance validator sees all entities after entity validation. It runs when at least one current entity is strictly below its threshold. With no entities it skips unless `runOnEmpty: true`.

```ts
type Tag = "loan_number" | "document_type";

const contextual = new ConsoleNER<Tag, Services>({
  validator: {
    id: "resolve-document-for-loan",
    runBelowConfidence: 0.95,
    async validate(result, context) {
      const loans = result.entities.filter((entity) => entity.tag === "loan_number");
      const documents = result.entities.filter((entity) => entity.tag === "document_type");
      const enrichment = await context.services.resolveContext({ loans, documents });

      return {
        entities: applyEnrichment(result.entities, enrichment),
        metadata: { resolved: true },
      };
    },
  },
});
```

This layer can replace, add, or remove entities and attach result-level metadata. Returned spans are checked against the original text and confidence is clamped. The input result and its entity array are readonly and cloned; validators return updates rather than mutating the earlier recognition.

Crucially, the global decision is made after entity validators finish. If an entity moves from `0.80` to `1.00`, a global threshold of `0.90` sees `1.00` and can skip the backend call.

### Services, cancellation, concurrency, and failures

ConsoleNER knows nothing about transport. `services` is an application-defined object passed through `ValidationContext`, alongside the original text, recognition options, and optional signal.

```ts
const controller = new AbortController();

const pending = loans.recognizeAsync(
  "8041234567",
  { services },
  { signal: controller.signal },
);

controller.abort();
```

Eligible entity validators run concurrently, with a default limit of `6` configured through `validationConcurrency`. Once aborted, queued validation work is marked `aborted`; validators should honor `context.signal` to stop their own I/O.

Validator exceptions degrade gracefully by default. A failed entity validator leaves its local entity and prior confidence intact. A failed global validator leaves local and successful entity validation intact. States become `error`; raw exceptions are not exposed on results. Observe errors without logging inside the library:

```ts
new ConsoleNER({
  onValidationError(error, context) {
    report(error, context.phase, context.validatorId);
  },
});
```

## Overlaps

Conflicting matches are ranked deterministically by:

1. Higher `priority` (default `0`)
2. Higher confidence
3. Longer match
4. Earlier registration

Set `allowOverlap: true` on a pattern when its entities may coexist with overlapping matches. Tokenization cannot render overlapping spans twice, so it deterministically chooses the earliest span, preferring the longer span at the same start.

## Tokenization

Tokenization reuses an existing result and does no recognition work:

```ts
const tokens = ner.tokenize(result);
// [
//   { type: "text", value: "Email ", start: 0, end: 6 },
//   { type: "entity", tag: "email", value: "john@example.com", ... },
//   { type: "text", value: " about loan ", ... },
//   { type: "entity", tag: "loan_number", value: "8041234567", ... },
// ]
```

Entity tokens include the full resolved `entity` plus tag, value, normalized value, and positions.

## Built-in patterns

Broadly useful patterns are optional exports and are never automatically registered:

```ts
import {
  datePatterns,
  emailPattern,
  ipv4Pattern,
  moneyPattern,
  organizationPattern,
  paymentCardPattern,
  personPatterns,
  phonePattern,
  postalAddressPattern,
  routingNumberPattern,
} from "console-ner";

ner.register([
  ...personPatterns(),
  ...datePatterns(),
  emailPattern(),
  phonePattern({ confidence: 0.9 }),
  moneyPattern(),
  organizationPattern(),
  paymentCardPattern(),
  routingNumberPattern(),
  ipv4Pattern(),
  postalAddressPattern(),
]);
```

`personPatterns()` includes honorific, contextual, and capitalized full-name strategies. `datePatterns()` includes month-name, ISO, US numeric, and dotted day-first formats. Payment cards, routing numbers, and IPv4 addresses are checksum- or range-validated locally. Every helper accepts custom `tag`, `confidence`, `priority`, and ID options; pattern-set helpers treat `id` as a prefix.

Loan, employee, and document concepts remain application-specific. See [examples/domain.ts](./examples/domain.ts) for:

- a company-specific loan number with backend confirmation;
- an employee identifier with a meaningful five-character base and optional suffix;
- dictionary-based document aliases such as `bank stmt` and `bank statements`;
- global validation across loan and document entities.

## Interactive demo

Launch the Bun server for the complete workbench and server-assist example:

```sh
bun run demo
# http://127.0.0.1:4173
```

To open `demo/index.html` directly for the client-only workbench, run `bun run build` first so the browser can import `dist/index.js`.

The `demo` command hot-reloads the Bun server and refreshes connected browsers when `demo/index.html` or server-side code changes. Use `bun start` to run without development hot reload.

The server hosts the same demo and exposes `POST /api/recognize`. It uses ConsoleNER's asynchronous validation pipeline to simulate directory lookups, checksum verification, and contextual enrichment for loan and case references, organizations, payment cards, routing numbers, IPv4 addresses, and US postal addresses.

The sample deliberately includes two rejected candidates so the UI can show the difference between server checks and yielded results. Server-assisted matches receive a visual glow and an `Assisted` badge. Turn off **Server assist** at any time to compare the local-only result set; if the API is unavailable, the editor continues to work locally.

## Browser, Node.js, and Bun

ConsoleNER is ESM, uses standard JavaScript APIs, and ships declarations and source maps. It has no runtime dependencies and does not call `fetch`, touch the filesystem, or log. Import the same package from browsers through Vite/Rollup/esbuild/Webpack or from modern Node.js and Bun.

## Performance and benchmarks

The synchronous path scans enabled patterns and is aimed at interactive inputs of roughly 20–5,000 characters. Context strings are only allocated for accepted raw matches. Async work is the expensive layer, and confidence thresholds prevent needless service calls.

Run the non-asserting benchmark matrix:

```sh
npm run benchmark
```

It covers 100, 1,000, and 10,000 characters with 10, 50, and 100 patterns, reports match counts, and includes a 100-entity simulation where only 14 validators pass threshold filtering.

## Development

```sh
npm run test
npm run typecheck
npm run lint
npm run build
```

The implementation is strict TypeScript. Public APIs use generics and `unknown`, with no `any`, decorators, framework coupling, runtime reflection, or mutable global registry.

## License

MIT
