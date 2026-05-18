// Map a MIME type to the file extension used for storage keys. Shared
// between the feature-image and release-image orchestrators. Providers
// occasionally return uppercase, parameterized (`image/jpeg; charset=…`),
// or non-standard variants (`image/jpg`); normalize before matching.

export function extensionFromMimeType(mimeType: string): string {
  const normalized = mimeType.toLowerCase().split(';', 1)[0]!.trim();
  switch (normalized) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    default:
      return 'png';
  }
}
