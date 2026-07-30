// Multer's fileFilter only sees the client-supplied Content-Type header,
// which is trivially spoofable. This checks the actual file bytes (magic
// numbers) against what the client claimed, so a renamed/relabeled malicious
// file can't slip through the MIME allow-list.

function matchesSignature(buffer, mimetype) {
  if (buffer.length < 4) return false;

  switch (mimetype) {
    case 'image/jpeg':
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case 'image/png':
      return buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case 'image/webp':
      return buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP';
    case 'application/pdf':
      return buffer.slice(0, 4).toString('ascii') === '%PDF';
    case 'audio/mpeg':
      return (
        buffer.slice(0, 3).toString('ascii') === 'ID3' ||
        (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
      );
    case 'audio/ogg':
      return buffer.slice(0, 4).toString('ascii') === 'OggS';
    case 'audio/webm':
      return buffer.slice(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    case 'audio/mp4':
      return buffer.length >= 12 && buffer.slice(4, 8).toString('ascii') === 'ftyp';
    default:
      // Unknown-to-us mimetype: nothing to verify against, so don't block
      // it here - the fileFilter allow-list is still the primary gate.
      return true;
  }
}

module.exports = { matchesSignature };
