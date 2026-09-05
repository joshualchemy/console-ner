import type { CompromiseLexicon } from "./compromise";
import { compromiseMoneyPattern } from "./money";
import { compromiseOrganizationPattern } from "./organization";
import { compromisePersonPattern } from "./person";
import { compromisePlacePattern } from "./place";
import type { BuiltInPattern } from "./types";
import { builtInId } from "./utilities";

export type CompromiseBuiltInTag = "money" | "organization" | "person" | "place";

export interface CompromisePatternsOptions {
  readonly id?: string;
  readonly lexicon?: CompromiseLexicon;
}

export function compromisePatterns(
  options: CompromisePatternsOptions = {},
): readonly BuiltInPattern<CompromiseBuiltInTag>[] {
  return [
    compromisePersonPattern({
      id: builtInId(options.id, "compromise-person"),
      tag: "person",
      ...(options.lexicon === undefined ? {} : { lexicon: options.lexicon }),
    }),
    compromiseOrganizationPattern({
      id: builtInId(options.id, "compromise-organization"),
      tag: "organization",
      ...(options.lexicon === undefined ? {} : { lexicon: options.lexicon }),
    }),
    compromisePlacePattern({
      id: builtInId(options.id, "compromise-place"),
      tag: "place",
      ...(options.lexicon === undefined ? {} : { lexicon: options.lexicon }),
    }),
    compromiseMoneyPattern({
      id: builtInId(options.id, "compromise-money"),
      tag: "money",
      ...(options.lexicon === undefined ? {} : { lexicon: options.lexicon }),
    }),
  ];
}
