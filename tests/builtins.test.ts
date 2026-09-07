import { describe, expect, it } from "vitest";
import {
  ConsoleNER,
  compromisePatterns,
  compromisePersonPattern,
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
} from "../src";

describe("built-in patterns", () => {
  it("recognizes and normalizes common contact and money values", () => {
    const ner = new ConsoleNER<"email" | "money" | "phone">({ compromise: false }).register([
      emailPattern(),
      moneyPattern(),
      phonePattern(),
    ]);

    expect(
      ner
        .recognize("Email MAYA@example.com or call (312) 555-0148 about $248,500.00.")
        .entities.map(({ tag, normalizedValue }) => ({ tag, normalizedValue })),
    ).toEqual([
      { tag: "email", normalizedValue: "maya@example.com" },
      { tag: "phone", normalizedValue: "+13125550148" },
      { tag: "money", normalizedValue: "248500.00" },
    ]);
  });

  it("provides the common date formats as one reusable pattern set", () => {
    const ner = new ConsoleNER<"date">({ compromise: false }).register(datePatterns());
    const values = ner
      .recognize("September 12, 2026; 12 September 2026; 2026-09-03; 9/15/2026; 30.09.2026")
      .entities.map((entity) => entity.value);

    expect(values).toEqual([
      "September 12, 2026",
      "12 September 2026",
      "2026-09-03",
      "9/15/2026",
      "30.09.2026",
    ]);
  });

  it("provides honorific, contextual, and full-name person patterns", () => {
    const ner = new ConsoleNER<"person">({ compromise: false }).register(personPatterns());
    const values = ner
      .recognize("Please ask Dr. José Álvarez and contact Maya. Jean-Luc Picard approved it.")
      .entities.map((entity) => entity.value);

    expect(values).toEqual(["José Álvarez", "Maya", "Jean-Luc Picard"]);
  });

  it("provides browser-safe organization, address, and validated numeric patterns", () => {
    const ner = new ConsoleNER<
      "ip_address" | "organization" | "payment_card" | "postal_address" | "routing_number"
    >({ compromise: false }).register([
      organizationPattern(),
      paymentCardPattern(),
      routingNumberPattern(),
      ipv4Pattern(),
      postalAddressPattern(),
    ]);
    const result = ner.recognize(
      "Northstar Analytics LLC at 233 S Wacker Dr, Chicago, IL 60606; " +
      "card 4111 1111 1111 1111; routing 021000021; IP 192.168.1.42. " +
      "Reject card 4111 1111 1111 1112, routing 123456789, and IP 999.1.1.1.",
    );

    expect(result.entities.map(({ tag, normalizedValue }) => ({ tag, normalizedValue }))).toEqual([
      { tag: "organization", normalizedValue: "Northstar Analytics LLC" },
      { tag: "postal_address", normalizedValue: "233 S Wacker Dr, Chicago, IL 60606" },
      { tag: "payment_card", normalizedValue: "4111111111111111" },
      { tag: "routing_number", normalizedValue: "021000021" },
      { tag: "ip_address", normalizedValue: "192.168.1.42" },
    ]);
  });

  it("prefers a complete postal address over person-like fragments inside it", () => {
    const ner = new ConsoleNER<"person" | "postal_address">({ compromise: false }).register([
      compromisePersonPattern(),
      postalAddressPattern(),
    ]);

    expect(ner.recognize("Ship to 233 S Wacker Dr, Chicago, IL 60606.").entities.map(
      ({ tag, value }) => ({ tag, value }),
    )).toEqual([
      { tag: "postal_address", value: "233 S Wacker Dr, Chicago, IL 60606" },
    ]);
  });

  it("provides contextual Compromise patterns with exact offsets and metadata", () => {
    const text = "Later, mary met Google in Paris to discuss twelve dollars in filing fees.";
    const ner = new ConsoleNER<"money" | "organization" | "person" | "place">({
      compromise: false,
    })
      .register(compromisePatterns());
    const entities = ner.recognize(text).entities;

    expect(entities.map(({ tag, value, normalizedValue }) => ({
      tag,
      value,
      normalizedValue,
    }))).toEqual([
      { tag: "person", value: "mary", normalizedValue: "mary" },
      { tag: "organization", value: "Google", normalizedValue: "Google" },
      { tag: "place", value: "Paris", normalizedValue: "Paris" },
      { tag: "money", value: "twelve dollars", normalizedValue: "12" },
    ]);
    expect(entities.every((entity) => text.slice(entity.start, entity.end) === entity.value))
      .toBe(true);
    expect(entities.every((entity) =>
      (entity.metadata as { engine?: string } | undefined)?.engine === "compromise"
    )).toBe(true);
  });

  it("accepts a scoped Compromise lexicon for unknown lowercase names", () => {
    const ner = new ConsoleNER<"person">({ compromise: false }).register(
      compromisePersonPattern({
        lexicon: { xyloph: "FirstName", zorb: "LastName" },
      }),
    );

    expect(ner.recognize("email xyloph zorb tomorrow").entities[0]?.value)
      .toBe("xyloph zorb");
  });

  it("supports custom tags across built-in pattern sets", () => {
    const ner = new ConsoleNER<"calendar_date" | "person_name">({ compromise: false }).register([
      ...datePatterns({ tag: "calendar_date" }),
      ...personPatterns({ tag: "person_name" }),
    ]);

    expect(ner.recognize("Contact Maya on 2026-09-03").entities.map((entity) => entity.tag)).toEqual([
      "person_name",
      "calendar_date",
    ]);
  });
});
