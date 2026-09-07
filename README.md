# ConsoleNER

Deterministic named entity recognition for TypeScript. Register regular expressions or custom matchers, recognize entities synchronously, and optionally validate uncertain results with your own async services.

ConsoleNER does not choose your HTTP client, database, or application framework. It gives you a predictable local recognition pass and a separate validation pipeline.

ConsoleNER is ESM and works in modern Node.js, Bun, and browser builds. Its
built-in language recognizer provides person, organization, place, and money
entities out of the box.

<img width="1431" height="689" alt="image" src="https://github.com/user-attachments/assets/14200982-3897-4070-ba05-ec3a2a5842b8" />

## Quick start

```ts
import { ConsoleNER, emailPattern, type LanguageBuiltInTag } from "console-ner";

type Tag = LanguageBuiltInTag | "email" | "order_id";

const ner = new ConsoleNER<Tag>();

ner.register([
  emailPattern(),
  {
    id: "order-id",
    tag: "order_id",
    pattern: /\bORD-\d{6}\b/g,
    confidence: 0.98,
  },
]);

const result = ner.recognize("Email alex@example.com about order ORD-123456.");

for (const entity of result.entities) {
  console.log(entity.tag, entity.value, entity.confidence);
}
```

Recognition is synchronous and never calls validators. Each entity includes its `tag`, source `value`, `normalizedValue`, zero-based `[start, end)` range, `confidence`, and validation state.

## Register patterns

Tags are strings. Use a union to get type checking throughout your application.

```ts
type Tag = "email" | "phone" | "document";
const ner = new ConsoleNER<Tag>({ language: false });

ner.register({
  id: "email",
  tag: "email",
  pattern: /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/gi,
  confidence: 0.95,
});

ner.register([
  { id: "phone-us", tag: "phone", pattern: /\b\d{3}-\d{3}-\d{4}\b/g },
  { id: "phone-intl", tag: "phone", pattern: /\+\d[\d -]{7,}/g },
]);
```

Pattern IDs are optional, but explicit IDs make enable, disable, and unregister operations clear. Duplicate IDs are rejected.

### Filter one recognition pass

Filters do not change the registry:

```ts
ner.recognize(text, { tags: ["email"] });
ner.recognize(text, { excludeTags: ["phone"] });
ner.recognize(text, { patternIds: ["email"] });
ner.recognize(text, { excludePatternIds: ["phone-us"] });
```

### Manage registered patterns

```ts
ner.disablePattern("phone-us");
ner.enablePattern("phone-us");
ner.unregisterPattern("phone-intl");
ner.unregisterTag("phone");
ner.clear();
```

## Built-in patterns

Language-aware person, organization, place, and money patterns are registered
automatically. Additional built-ins are exported helpers that you register when
needed.

```ts
import {
  datePatterns,
  emailPattern,
  moneyPattern,
  naturalDatePattern,
  personPatterns,
  phonePattern,
} from "console-ner";

ner.register([
  ...personPatterns(),
  ...datePatterns(),
  emailPattern(),
  phonePattern({ confidence: 0.9 }),
  moneyPattern(),
  naturalDatePattern(),
]);
```

Other built-ins include `organizationPattern`, `paymentCardPattern`, `routingNumberPattern`, `ipv4Pattern`, and `postalAddressPattern`. Built-in options support application-specific tags, confidence, priority, and IDs.

### Enriched phone and natural-date built-ins

`phonePattern` recognizes national and international phone numbers in browser or
server builds. It defaults unprefixed numbers to the US; pass `defaultCountry`
for another region. Matches normalize to E.164 and include country, calling
code, national/international display formats, and validity metadata.

```ts
import {
  ConsoleNER,
  naturalDatePattern,
  phonePattern,
  type NaturalDateEntityMetadata,
  type PhoneEntityMetadata,
} from "console-ner";

type Metadata = NaturalDateEntityMetadata | PhoneEntityMetadata;
const enriched = new ConsoleNER<"date" | "phone", undefined, Metadata>({
  language: false,
}).register([
  phonePattern({ defaultCountry: "GB" }),
  naturalDatePattern({
    referenceDate: new Date("2026-09-12T17:00:00.000Z"),
    timezone: -300,
  }),
]);

enriched.recognize(
  "Call +44 20 7946 0958 tomorrow from 10 to 11 AM.",
);
```

`naturalDatePattern` handles relative phrases, weekdays, times, and ranges. Its
reference instant is captured when the pattern is created; provide explicit
`referenceDate` and `timezone` values when reproducible timestamps matter. Set
`strict: true` to accept only formal date expressions or `forwardDate: true` to
prefer future dates.

Both helpers are synchronous, only run when registered, and use browser-safe,
tree-shakeable processing behind ConsoleNER's provider-neutral API. The demo
keeps heavier structured postal-address enrichment on its optional backend.

## Built-in language recognizer

A recognizer is a named group of patterns. Use one when an integration or a
domain module should be installed, toggled, or removed as a unit.

Pass `language: false` when an application needs an empty registry, or
customize the built-in recognizer during construction:

```ts
const patternsOnly = new ConsoleNER({ language: false });

const customized = new ConsoleNER({
  language: {
    id: "general-language",
    lexicon: { xyloph: "FirstName", zorb: "LastName" },
  },
});
```

Set `enabled: false` to install the default recognizer in a disabled state, or
use `allowOverlap: true` when language matches should coexist with overlapping
application patterns.

Applications can add their own recognizers alongside the default, or opt out
for a tightly scoped domain registry:

```ts
import { ConsoleNER, type RecognizerDefinition } from "console-ner";

type Tag = "ticket" | "deployment";

const operations = {
  id: "operations",
  patterns: [
    { id: "ticket", tag: "ticket", pattern: /\bOPS-\d+\b/g },
    { id: "deployment", tag: "deployment", pattern: /\bdeploy-[a-f0-9]{7}\b/g },
  ],
} satisfies RecognizerDefinition<Tag>;

const appNER = new ConsoleNER<Tag>({ language: false }).registerRecognizer(
  operations,
);
```

Pattern IDs remain independently controllable inside a recognizer. Disabling a
recognizer does not overwrite those per-pattern settings. Registration is
transactional: a duplicate pattern or recognizer ID rejects the whole group.

## Normalize and add metadata

The original text is always preserved in `value`. Use `normalize` for a canonical value and `metadata` for application data.

```ts
interface PhoneMetadata {
  format: "us";
}

const phones = new ConsoleNER<"phone", undefined, PhoneMetadata>({
  language: false,
  contextWindow: 80,
});

phones.register({
  tag: "phone",
  pattern: /\(\d{3}\) \d{3}-\d{4}/g,
  normalize: (value) => `+1${value.replace(/\D/g, "")}`,
  metadata: () => ({ format: "us" }),
});
```

Normalizers and metadata callbacks receive a bounded `MatchContext` containing `text`, `start`, `end`, `before`, and `after`. Context defaults to 100 characters and can be changed with `contextWindow`.

## Custom matchers

Use a matcher for dictionaries, aliases, tries, or other synchronous recognition logic.

```ts
import type { PatternMatcher } from "console-ner";

const documents: PatternMatcher<{ category: string }> = (text) => {
  const alias = "bank statements";
  const start = text.toLowerCase().indexOf(alias);
  if (start < 0) return [];

  return [
    {
      value: text.slice(start, start + alias.length),
      start,
      end: start + alias.length,
      normalizedValue: "bank_statement",
      confidence: 0.96,
      metadata: { category: "financial" },
    },
  ];
};

ner.register({ tag: "document", pattern: documents });
```

Matches must have a non-empty range and a `value` equal to the corresponding source slice. Invalid matches are ignored.

## Validate uncertain entities

Validation is opt-in. Attach a validator to a pattern when an entity needs a service or database check. Services are application-defined and passed to validators through `context.services`.

```ts
interface Services {
  orderExists(id: string): Promise<boolean>;
}

const orders = new ConsoleNER<"order_id", Services>({
  language: false,
  defaultValidatorThreshold: 1,
});

orders.register({
  id: "order-id",
  tag: "order_id",
  pattern: /\bORD-\d{6}\b/g,
  confidence: 0.98,
  validator: {
    id: "order-directory",
    runBelowConfidence: 1,
    async validate(entity, context) {
      const valid = await context.services.orderExists(entity.normalizedValue);
      return {
        valid,
        confidence: valid ? 1 : 0.1,
        metadata: { checked: true },
      };
    },
  },
});

const initial = orders.recognize("Please check ORD-123456.");
const validated = await orders.validate(initial, { services });
```

`validate` returns a new result, so the initial result can be rendered immediately. The convenience method `recognizeAsync(text, context, options)` performs both steps.

Validators run only when confidence is strictly below their threshold. The default threshold is `1`, so every result below perfect confidence is eligible. A validator can return `valid`, `confidence`, `normalizedValue`, and partial `metadata`.

### Global validation

Use the instance-level validator when a decision depends on multiple entities or needs result-level metadata.

```ts
type Tag = "order_id" | "document";

const contextual = new ConsoleNER<Tag, Services, unknown, { linked: boolean }>({
  language: false,
  validator: {
    id: "link-order-document",
    runBelowConfidence: 0.95,
    async validate(result, context) {
      // Call your service with result.entities and context.services.
      return {
        entities: result.entities,
        metadata: { linked: true },
      };
    },
  },
});
```

Global validation runs after entity validators and sees their updated confidence. It can return replacement, added, or removed entities. With no entities it skips unless `runOnEmpty: true`.

### Cancellation and failures

Pass an `AbortSignal` through validation options. Validators should honor `context.signal` when making I/O calls.

```ts
const controller = new AbortController();
const pending = orders.recognizeAsync(
  text,
  { services },
  { signal: controller.signal },
);

controller.abort();
await pending;
```

Entity validators run concurrently, with a default limit of six (`validationConcurrency`). Validator failures are reported as `error` states while successful results remain available. Observe raw errors with `onValidationError`.

## Overlaps and confidence

When matches overlap, ConsoleNER resolves them deterministically by:

1. Higher `priority` (default `0`)
2. Higher confidence
3. Longer match
4. Earlier registration

Set `allowOverlap: true` when overlapping entities should coexist. Confidence values and thresholds are clamped to `0..1`; non-finite values become `0`.

## Tokenize a result

Tokenization reuses an existing recognition result and performs no additional matching.

```ts
const tokens = ner.tokenize(result);

for (const token of tokens) {
  if (token.type === "entity") {
    console.log(`<mark>${token.value}</mark>`);
  } else {
    console.log(token.value);
  }
}
```

Entity tokens include the complete entity object. Overlapping entities cannot both occupy the same token span; the earliest span wins, with longer spans preferred at the same start.

## API at a glance

| Method                                     | Purpose                                        |
| ------------------------------------------ | ---------------------------------------------- |
| `register(pattern)`                        | Add one or more patterns                       |
| `registerRecognizer(recognizer)`           | Add a named group of patterns                  |
| `recognize(text, options?)`                | Find entities synchronously                    |
| `validate(result, context?, options?)`     | Run eligible async validators                  |
| `recognizeAsync(text, context?, options?)` | Recognize, then validate                       |
| `tokenize(result)`                         | Convert a result into text and entity tokens   |
| `enablePattern` / `disablePattern`         | Toggle a pattern                               |
| `enableRecognizer` / `disableRecognizer`   | Toggle a recognizer and all its patterns       |
| `unregisterPattern` / `unregisterTag`      | Remove registered patterns                     |
| `unregisterRecognizer`                     | Remove a recognizer and its remaining patterns |
| `listRecognizers()`                        | Inspect registered recognizer IDs and state    |
| `clear()`                                  | Remove all patterns                            |

## Demo and development

Run the interactive workbench with Bun:

```sh
bun run demo
# http://127.0.0.1:4173
```

Run the project checks:

```sh
npm run test
npm run typecheck
npm run lint
npm run build
```

The complete domain-specific example is in [examples/domain.ts](./examples/domain.ts). It demonstrates custom matchers, metadata, entity validation, and global validation.

## License

MIT
