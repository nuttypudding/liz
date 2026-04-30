/**
 * Display helpers for composite fields (names split into first/last,
 * addresses split into street/city/state/postal).
 */

export function fullName(person: { first_name?: string | null; last_name?: string | null }): string {
  const first = (person.first_name ?? "").trim();
  const last = (person.last_name ?? "").trim();
  return `${first} ${last}`.trim();
}

export function formatAddress(
  prop: {
    address_line1?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
  },
  opts: { apt_or_unit_no?: string | null } = {}
): string {
  const line1 = (prop.address_line1 ?? "").trim();
  const city = (prop.city ?? "").trim();
  const state = (prop.state ?? "").trim();
  const postal = (prop.postal_code ?? "").trim();
  const apt = (opts.apt_or_unit_no ?? "").trim();

  const streetPart = apt ? `${line1} ${apt}`.trim() : line1;
  const cityStateZip = [city, [state, postal].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");

  return [streetPart, cityStateZip].filter(Boolean).join(", ");
}
