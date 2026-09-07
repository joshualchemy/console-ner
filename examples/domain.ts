import { ConsoleNER, type PatternMatch } from "../src/index";

type AppTag = "loan_number" | "employee_number" | "document_type";

interface EntityMetadata {
  category?: string;
  loanId?: string;
  reviewState?: string;
}

interface AppServices {
  loanExists(value: string): Promise<boolean>;
  resolveContext(request: {
    loans: readonly string[];
    documents: readonly string[];
  }): Promise<{ reviewState?: string }>;
}

const documentAliases = new Map([
  ["appraisal", "appraisal"],
  ["bank stmt", "bank_statement"],
  ["bank statement", "bank_statement"],
  ["bank statements", "bank_statement"],
  ["pay stub", "pay_stub"],
  ["w-2", "w2"],
  ["tax return", "tax_return"],
  ["purchase agreement", "purchase_agreement"],
]);

function documentMatcher(text: string): PatternMatch<EntityMetadata>[] {
  const matches: PatternMatch<EntityMetadata>[] = [];
  const lower = text.toLowerCase();
  for (const [alias, normalizedValue] of documentAliases) {
    let start = lower.indexOf(alias);
    while (start !== -1) {
      matches.push({
        value: text.slice(start, start + alias.length),
        start,
        end: start + alias.length,
        normalizedValue,
        confidence: 0.96,
        metadata: { category: "financial" },
      });
      start = lower.indexOf(alias, start + alias.length);
    }
  }
  return matches;
}

export function createDomainNER(): ConsoleNER<AppTag, AppServices, EntityMetadata> {
  const ner = new ConsoleNER<AppTag, AppServices, EntityMetadata>({
    language: false,
    contextWindow: 80,
    validationConcurrency: 6,
    validator: {
      id: "application-context",
      runBelowConfidence: 0.95,
      async validate(result, context) {
        const loans = result.entities
          .filter((entity) => entity.tag === "loan_number")
          .map((entity) => entity.normalizedValue);
        const documents = result.entities
          .filter((entity) => entity.tag === "document_type")
          .map((entity) => entity.normalizedValue);
        const enrichment = await context.services.resolveContext({ loans, documents });
        return {
          entities: result.entities.map((entity) => ({
            ...entity,
            ...(enrichment.reviewState === undefined
              ? {}
              : { metadata: { ...entity.metadata, reviewState: enrichment.reviewState } }),
          })),
        };
      },
    },
  });

  ner.register([
    {
      id: "example-loan-number",
      tag: "loan_number",
      pattern: /\b80[4-9]\d{7}\b/g,
      confidence: 0.98,
      priority: 100,
      validator: {
        runBelowConfidence: 1,
        async validate(entity, context) {
          const exists = await context.services.loanExists(entity.normalizedValue);
          return { valid: exists, confidence: exists ? 1 : 0.1 };
        },
      },
    },
    {
      id: "example-employee-number",
      tag: "employee_number",
      pattern: /\b[A-Z]{2}\d{3}(?:-\d{2})?\b/g,
      confidence: 0.9,
      normalize: (value) => value.slice(0, 5),
    },
    {
      id: "example-document-dictionary",
      tag: "document_type",
      pattern: documentMatcher,
    },
  ]);

  return ner;
}
