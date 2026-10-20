// Removes email addresses, phone numbers and street addresses from CV text
// before it is stored or sent to the AI. Heuristic: errs on the side of removing.

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

// Digit runs with phone-style separators (no "/" so dates like 09/2021 are kept)
const PHONE_CANDIDATE = /(?:\+|\b00)?\(?\d[\d \t().-]{7,}\d/g;
const YEAR_GROUP = /^(19|20)\d{2}$/;

const STREET_WORDS_EN =
  "Street|St\\.?|Avenue|Ave\\.?|Road|Rd\\.?|Boulevard|Blvd\\.?|Lane|Ln\\.?|Drive|Way|Court|Ct\\.?|Place|Square|Terrace|Close|Crescent";
// "123 Main Street", "10 Downing St, London"
const ADDRESS_EN = new RegExp(
  `\\b\\d{1,5}[A-Za-z]?,?\\s+(?:[A-Z][\\w'.-]*\\s+){0,4}(?:${STREET_WORDS_EN})\\b[^\\n]{0,40}`,
  "g"
);
// "Calle Mayor 12, 3ºB", "Avda. de América 5", "Rue de Rivoli 10", "Via Roma 3"
const ADDRESS_EU = new RegExp(
  "\\b(?:Calle|C\\/|Avenida|Avda\\.?|Av\\.|Paseo|Pº|Plaza|Pza\\.?|Ronda|Camino|Carrer|Travessera|Rua|Rue|Via|Viale|Corso|Piazza)\\s+[^\\n,]{1,50}?,?\\s*(?:n[º°o]\\.?\\s*)?\\d{1,4}[^\\n]{0,30}",
  "g"
);
// "Hauptstraße 5", "Gartenweg 12"
const ADDRESS_DE = /\b[A-ZÄÖÜ][\wäöüß-]*(?:straße|strasse|str\.|weg|allee|platz|gasse)\s+\d{1,4}[a-z]?\b[^\n]{0,30}/g;
// "28001 Madrid", "10115 Berlin", "90210-1234 Beverly Hills" (same line only)
const POSTCODE_CITY = /\b\d{5}(?:-\d{4})?[ \t]+(?!(?:Euros?|Dollars?|Pounds?|Users?|Students?|Followers?|Downloads?|Views?|Members?|Customers?|Clients?|People|Participants?|Visitors?|Units?)\b)[A-ZÁÉÍÓÚÄÖÜ][a-záéíóúñäöüß]+(?:[ \t]+[A-Z][a-záéíóúñäöüß]+)?/g;
// UK postcodes: "SW1A 1AA"
const UK_POSTCODE = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/g;

export function redactPersonalData(input: string): string {
  let text = input.replace(EMAIL, "[email removed]");

  text = text.replace(PHONE_CANDIDATE, (match) => {
    const digits = match.replace(/\D/g, "");
    if (digits.length < 9 || digits.length > 15) return match;
    const groups = match.split(/[^\d]+/).filter(Boolean);
    const looksLikeDates = !match.trim().startsWith("+") && groups.some((g) => YEAR_GROUP.test(g));
    return looksLikeDates ? match : "[phone removed]";
  });

  for (const pattern of [ADDRESS_EN, ADDRESS_EU, ADDRESS_DE, POSTCODE_CITY, UK_POSTCODE]) {
    text = text.replace(pattern, "[address removed]");
  }

  return text.replace(/[ \t]{2,}/g, " ").trim();
}
