export function buildPresignedUploadHeaders(
  providerHeaders?: Record<string, string | number>
) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(providerHeaders || {})) {
    headers.set(name, String(value));
  }
  return headers;
}
