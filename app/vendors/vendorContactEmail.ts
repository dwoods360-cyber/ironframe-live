export function vendorContactEmail(vendorName: string): string {
  const slug = vendorName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug}@vendors.ironframe.local`;
}
