import { performance } from "node:perf_hooks";
import { ConsoleNER } from "../src";

function makeText(length: number): string {
  const unit = "alpha code0 beta code1 gamma code2 delta ";
  return unit.repeat(Math.ceil(length / unit.length)).slice(0, length);
}

for (const textLength of [100, 1_000, 10_000]) {
  for (const patternCount of [10, 50, 100]) {
    const ner = new ConsoleNER<string>({ compromise: false });
    ner.register(
      Array.from({ length: patternCount }, (_, index) => ({
        id: `benchmark-${index}`,
        tag: `code-${index}`,
        pattern: new RegExp(`\\bcode${index}\\b`, "g"),
        confidence: 0.95,
      })),
    );
    const text = makeText(textLength);
    const started = performance.now();
    const result = ner.recognize(text);
    const duration = performance.now() - started;
    process.stdout.write(
      `${textLength.toString().padStart(5)} chars | ${patternCount.toString().padStart(3)} patterns | ${duration.toFixed(3).padStart(8)} ms | ${result.entities.length} matches\n`,
    );
  }
}

let validationCalls = 0;
const validationBenchmark = new ConsoleNER<string>({ compromise: false }).register(
  Array.from({ length: 100 }, (_, index) => ({
    id: `validation-${index}`,
    tag: `value-${index}`,
    pattern: new RegExp(`\\bv${index}\\b`, "g"),
    confidence: index < 14 ? 0.7 : 0.99,
    validator: {
      runBelowConfidence: 0.9,
      validate: () => {
        validationCalls++;
        return { valid: true };
      },
    },
  })),
);
const validationText = Array.from({ length: 100 }, (_, index) => `v${index}`).join(" ");
await validationBenchmark.validate(validationBenchmark.recognize(validationText));
process.stdout.write(`threshold simulation | 100 entities | ${validationCalls} validator calls\n`);
