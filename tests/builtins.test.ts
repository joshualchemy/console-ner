import { describe, expect, it } from "vitest";
import {
  ConsoleNER,
  languagePatterns,
  languagePersonPattern,
  datePatterns,
  emailPattern,
  ipv4Pattern,
  moneyPattern,
  naturalDatePattern,
  organizationPattern,
  paymentCardPattern,
  personPatterns,
  phonePattern,
  type PhoneEntityMetadata,
  postalAddressPattern,
  routingNumberPattern,
} from "../src";

describe("built-in patterns", () => {
  it("recognizes and normalizes common contact and money values", () => {
    const ner = new ConsoleNER<"email" | "money" | "phone">({ language: false }).register([
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

  it("recognizes international phone numbers with structured metadata", () => {
    const text = "London +44 20 7946 0958; Chicago (312) 555-0148.";
    const entities = new ConsoleNER<"phone", undefined, PhoneEntityMetadata>({
      language: false,
    })
      .register(phonePattern())
      .recognize(text).entities;

    expect(entities.map(({ normalizedValue, metadata }) => ({
      normalizedValue,
      country: metadata?.country,
      international: metadata?.international,
      valid: metadata?.valid,
    }))).toEqual([
      {
        normalizedValue: "+442079460958",
        country: "GB",
        international: "+44 20 7946 0958",
        valid: true,
      },
      {
        normalizedValue: "+13125550148",
        country: "US",
        international: "+1 312 555 0148",
        valid: true,
      },
    ]);
  });

  it("does not reinterpret a phone-like numeric tail inside an identifier", () => {
    const text = "Review case CN-2026-004218, then call +1 (312) 555-0148.";
    const entities = new ConsoleNER<"phone">({ language: false })
      .register(phonePattern())
      .recognize(text).entities;

    expect(entities.map(({ value, normalizedValue }) => ({ value, normalizedValue })))
      .toEqual([
        { value: "+1 (312) 555-0148", normalizedValue: "+13125550148" },
      ]);
  });

  it("resolves natural date expressions and ranges against a stable reference", () => {
    const referenceDate = new Date("2026-09-12T17:00:00.000Z");
    const entities = new ConsoleNER<"date">({ language: false })
      .register(naturalDatePattern({ referenceDate, timezone: -300 }))
      .recognize("Meet tomorrow from 10 to 11 AM, then follow up next Friday.")
      .entities;

    expect(entities.map(({ value, normalizedValue }) => ({ value, normalizedValue })))
      .toEqual([
        {
          value: "tomorrow from 10 to 11 AM",
          normalizedValue:
            "2026-09-13T15:00:00.000Z/2026-09-13T16:00:00.000Z",
        },
        { value: "next Friday", normalizedValue: "2026-09-18" },
      ]);
    expect(entities[0]?.metadata).toMatchObject({
      category: "date",
      mode: "casual",
      resolvedStart: "2026-09-13T15:00:00.000Z",
      resolvedEnd: "2026-09-13T16:00:00.000Z",
    });
  });

  it("rejects an invalid natural-date reference", () => {
    expect(() => naturalDatePattern({ referenceDate: new Date(Number.NaN) }))
      .toThrow(/valid Date/);
  });

  it("provides the common date formats as one reusable pattern set", () => {
    const ner = new ConsoleNER<"date">({ language: false }).register(datePatterns());
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
    const ner = new ConsoleNER<"person">({ language: false }).register(personPatterns());
    const values = ner
      .recognize("Please ask Dr. José Álvarez and contact Maya. Jean-Luc Picard approved it.")
      .entities.map((entity) => entity.value);

    expect(values).toEqual(["José Álvarez", "Maya", "Jean-Luc Picard"]);
  });

  it("provides browser-safe organization, address, and validated numeric patterns", () => {
    const ner = new ConsoleNER<
      "ip_address" | "organization" | "payment_card" | "postal_address" | "routing_number"
    >({ language: false }).register([
      organizationPattern(),
      paymentCardPattern(),
      routingNumberPattern(),
      ipv4Pattern(),
      postalAddressPattern(),
    ]);
    const result = ner.recognize(
      "Northstar Analytics LLC at 233 S Wacker Dr, Chicago, IL 60606 and " +
      "111 Richmond St W, Toronto, ON M5H 2G4; meeting October 2, 2026 at " +
      "1 Microsoft Way, Redmond, WA 98052; " +
      "card 4111 1111 1111 1111; routing 021000021; IP 192.168.1.42. " +
      "Reject card 4111 1111 1111 1112, routing 123456789, and IP 999.1.1.1.",
    );

    expect(result.entities.map(({ tag, normalizedValue }) => ({ tag, normalizedValue }))).toEqual([
      { tag: "organization", normalizedValue: "Northstar Analytics LLC" },
      { tag: "postal_address", normalizedValue: "233 S Wacker Dr, Chicago, IL 60606" },
      { tag: "postal_address", normalizedValue: "111 Richmond St W, Toronto, ON M5H 2G4" },
      { tag: "postal_address", normalizedValue: "1 Microsoft Way, Redmond, WA 98052" },
      { tag: "payment_card", normalizedValue: "4111111111111111" },
      { tag: "routing_number", normalizedValue: "021000021" },
      { tag: "ip_address", normalizedValue: "192.168.1.42" },
    ]);
  });

  it("prefers a complete postal address over person-like fragments inside it", () => {
    const ner = new ConsoleNER<"person" | "postal_address">({ language: false }).register([
      languagePersonPattern(),
      postalAddressPattern(),
    ]);

    expect(ner.recognize("Ship to 233 S Wacker Dr, Chicago, IL 60606.").entities.map(
      ({ tag, value }) => ({ tag, value }),
    )).toEqual([
      { tag: "postal_address", value: "233 S Wacker Dr, Chicago, IL 60606" },
    ]);
  });

  it("provides contextual language patterns with exact offsets and metadata", () => {
    const text = "Later, mary met Google in Paris to discuss twelve dollars in filing fees.";
    const ner = new ConsoleNER<"money" | "organization" | "person" | "place">({
      language: false,
    })
      .register(languagePatterns());
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
      (entity.metadata as { category?: string } | undefined)?.category === entity.tag
    )).toBe(true);
  });

  it("accepts a scoped language lexicon for unknown lowercase names", () => {
    const ner = new ConsoleNER<"person">({ language: false }).register(
      languagePersonPattern({
        lexicon: { xyloph: "FirstName", zorb: "LastName" },
      }),
    );

    expect(ner.recognize("email xyloph zorb tomorrow").entities[0]?.value)
      .toBe("xyloph zorb");
  });

  it("supports custom tags across built-in pattern sets", () => {
    const ner = new ConsoleNER<"calendar_date" | "person_name">({ language: false }).register([
      ...datePatterns({ tag: "calendar_date" }),
      ...personPatterns({ tag: "person_name" }),
    ]);

    expect(ner.recognize("Contact Maya on 2026-09-03").entities.map((entity) => entity.tag)).toEqual([
      "person_name",
      "calendar_date",
    ]);
  });
});
