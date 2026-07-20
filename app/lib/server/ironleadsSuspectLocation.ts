/**
 * Website / postal address enrichment for Ironleads SUSPECT contacts.
 * Stored on contact.metadata when known; website may also derive from deal.accountDomain.
 */

export type SuspectPostalAddress = {
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
};

export type SuspectWebsiteContact = {
  phone: string | null;
  email: string | null;
  contactPageUrl: string | null;
  note: string | null;
};

export type SuspectNamedBuyer = {
  fullName: string;
  title: string | null;
  location: string | null;
  trigger: string | null;
  announcedAt: string | null;
  sourceUrls: string[];
  note: string | null;
};

export type SuspectExecutiveSponsor = {
  fullName: string;
  title: string | null;
  roleSince: string | null;
  chairmanSince: string | null;
  sourceUrls: string[];
  note: string | null;
};

export type SuspectCandidateEmail = {
  person: string;
  role: string | null;
  email: string;
  confidence: string | null;
  status: string | null;
  note: string | null;
};

export type SuspectBuyingCommitteeMember = {
  role: string;
  fullName: string | null;
  title: string | null;
  emails: Array<{ email: string; status: string; source: string | null }>;
  phones: Array<{ phone: string; kind: string; status: string; source: string | null }>;
  sourceUrls: string[];
  note: string | null;
};

export type SuspectBuyingCommittee = {
  researchedAt: string | null;
  skipped: boolean;
  skipReason: string | null;
  members: SuspectBuyingCommitteeMember[];
};

export type SuspectLocationFields = {
  websiteUrl: string | null;
  address: SuspectPostalAddress | null;
  addressLine: string | null;
  websiteContact: SuspectWebsiteContact | null;
  namedBuyer: SuspectNamedBuyer | null;
  executiveSponsor: SuspectExecutiveSponsor | null;
  candidateEmails: SuspectCandidateEmail[];
  buyingCommittee: SuspectBuyingCommittee | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function cleanText(value: unknown, max = 240): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

/** Normalize a domain or URL into an https website URL. */
export function websiteUrlFromDomainOrUrl(raw: string | null | undefined): string | null {
  const value = cleanText(raw, 320);
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
      return parsed.toString().replace(/\/$/, "");
    } catch {
      return null;
    }
  }
  const domain = value
    .replace(/^www\./i, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
  if (!/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) return null;
  return `https://${domain}`;
}

export function resolveSuspectAddress(metadata: unknown): SuspectPostalAddress | null {
  const meta = asRecord(metadata);
  const raw = asRecord(meta?.address);
  if (!raw) return null;
  const address: SuspectPostalAddress = {
    street: cleanText(raw.street, 200),
    city: cleanText(raw.city, 120),
    state: cleanText(raw.state, 80),
    zip: cleanText(raw.zip, 32),
    country: cleanText(raw.country, 80),
  };
  if (!address.street && !address.city && !address.state && !address.zip) {
    return null;
  }
  return address;
}

export function formatSuspectAddressLine(address: SuspectPostalAddress | null): string | null {
  if (!address) return null;
  const cityState = [address.city, address.state].filter(Boolean).join(", ");
  const locality = [cityState, address.zip].filter(Boolean).join(" ");
  const parts = [address.street, locality, address.country].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export function resolveSuspectWebsiteContact(metadata: unknown): SuspectWebsiteContact | null {
  const meta = asRecord(metadata);
  const raw = asRecord(meta?.websiteContact);
  if (!raw) return null;
  const phone = cleanText(raw.phone, 40);
  const email = cleanText(raw.email, 320)?.toLowerCase() ?? null;
  const contactPageUrl = websiteUrlFromDomainOrUrl(
    typeof raw.contactPageUrl === "string" ? raw.contactPageUrl : null,
  );
  const note = cleanText(raw.note, 500);
  if (!phone && !email && !contactPageUrl) return null;
  return { phone, email, contactPageUrl, note };
}

function resolveSourceUrls(raw: unknown, max = 8): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((u): u is string => typeof u === "string")
    .map((u) => websiteUrlFromDomainOrUrl(u))
    .filter((u): u is string => Boolean(u))
    .slice(0, max);
}

export function resolveSuspectNamedBuyer(metadata: unknown): SuspectNamedBuyer | null {
  const meta = asRecord(metadata);
  const raw = asRecord(meta?.namedBuyer);
  if (!raw) return null;
  const fullName = cleanText(raw.fullName, 200);
  if (!fullName) return null;
  return {
    fullName,
    title: cleanText(raw.title, 200),
    location: cleanText(raw.location, 200),
    trigger: cleanText(raw.trigger, 80),
    announcedAt: cleanText(raw.announcedAt, 40),
    sourceUrls: resolveSourceUrls(raw.sourceUrls),
    note: cleanText(raw.note, 800),
  };
}

export function resolveSuspectExecutiveSponsor(metadata: unknown): SuspectExecutiveSponsor | null {
  const meta = asRecord(metadata);
  const raw = asRecord(meta?.executiveSponsor);
  if (!raw) return null;
  const fullName = cleanText(raw.fullName, 200);
  if (!fullName) return null;
  return {
    fullName,
    title: cleanText(raw.title, 240),
    roleSince: cleanText(raw.roleSince, 40),
    chairmanSince: cleanText(raw.chairmanSince, 40),
    sourceUrls: resolveSourceUrls(raw.sourceUrls),
    note: cleanText(raw.note, 800),
  };
}

export function resolveSuspectCandidateEmails(metadata: unknown): SuspectCandidateEmail[] {
  const meta = asRecord(metadata);
  if (!Array.isArray(meta?.candidateEmails)) return [];
  const out: SuspectCandidateEmail[] = [];
  for (const row of meta.candidateEmails) {
    const raw = asRecord(row);
    if (!raw) continue;
    const email = cleanText(raw.email, 320)?.toLowerCase() ?? null;
    const person = cleanText(raw.person, 200);
    if (!email || !person) continue;
    out.push({
      person,
      role: cleanText(raw.role, 80),
      email,
      confidence: cleanText(raw.confidence, 120),
      status: cleanText(raw.status, 40),
      note: cleanText(raw.note, 500),
    });
  }
  return out.slice(0, 12);
}

export function resolveSuspectBuyingCommittee(metadata: unknown): SuspectBuyingCommittee | null {
  const meta = asRecord(metadata);
  const raw = asRecord(meta?.buyingCommittee);
  if (!raw) return null;
  const membersRaw = Array.isArray(raw.members) ? raw.members : [];
  const members: SuspectBuyingCommitteeMember[] = [];
  for (const row of membersRaw) {
    const m = asRecord(row);
    if (!m) continue;
    const role = cleanText(m.role, 40);
    if (!role) continue;
    const emails = Array.isArray(m.emails)
      ? m.emails
          .map((e) => asRecord(e))
          .filter((e): e is Record<string, unknown> => Boolean(e))
          .map((e) => ({
            email: cleanText(e.email, 320)?.toLowerCase() ?? "",
            status: cleanText(e.status, 40) ?? "unverified",
            source: cleanText(e.source, 200),
          }))
          .filter((e) => e.email)
      : [];
    const phones = Array.isArray(m.phones)
      ? m.phones
          .map((p) => asRecord(p))
          .filter((p): p is Record<string, unknown> => Boolean(p))
          .map((p) => ({
            phone: cleanText(p.phone, 40) ?? "",
            kind: cleanText(p.kind, 40) ?? "switchboard",
            status: cleanText(p.status, 40) ?? "published",
            source: cleanText(p.source, 200),
          }))
          .filter((p) => p.phone)
      : [];
    members.push({
      role,
      fullName: cleanText(m.fullName, 200),
      title: cleanText(m.title, 240),
      emails,
      phones,
      sourceUrls: resolveSourceUrls(m.sourceUrls),
      note: cleanText(m.note, 800),
    });
  }
  return {
    researchedAt: cleanText(raw.researchedAt, 40),
    skipped: Boolean(raw.skipped),
    skipReason: cleanText(raw.skipReason, 240),
    members,
  };
}

export function resolveSuspectLocationFields(input: {
  metadata: unknown;
  accountDomain?: string | null;
}): SuspectLocationFields {
  const meta = asRecord(input.metadata);
  const fromMeta = websiteUrlFromDomainOrUrl(
    typeof meta?.websiteUrl === "string" ? meta.websiteUrl : null,
  );
  const fromDomain = websiteUrlFromDomainOrUrl(input.accountDomain ?? null);
  const address = resolveSuspectAddress(input.metadata);
  return {
    websiteUrl: fromMeta ?? fromDomain,
    address,
    addressLine: formatSuspectAddressLine(address),
    websiteContact: resolveSuspectWebsiteContact(input.metadata),
    namedBuyer: resolveSuspectNamedBuyer(input.metadata),
    executiveSponsor: resolveSuspectExecutiveSponsor(input.metadata),
    candidateEmails: resolveSuspectCandidateEmails(input.metadata),
    buyingCommittee: resolveSuspectBuyingCommittee(input.metadata),
  };
}
