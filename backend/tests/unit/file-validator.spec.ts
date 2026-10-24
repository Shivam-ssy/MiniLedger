import { validateImageMagicBytes } from '../../src/utils/file-validator.util';

describe('File Validator Utility', () => {
  it('identifies JPEG magic bytes', () => {
    const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const res = validateImageMagicBytes(jpegHeader);
    expect(res.valid).toBe(true);
    expect(res.mime).toBe('image/jpeg');
    expect(res.ext).toBe('jpg');
  });

  it('identifies PNG magic bytes', () => {
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    const res = validateImageMagicBytes(pngHeader);
    expect(res.valid).toBe(true);
    expect(res.mime).toBe('image/png');
    expect(res.ext).toBe('png');
  });

  it('identifies WebP magic bytes', () => {
    // RIFF (0-3) + bytes 4-7 + WEBP (8-11)
    const webpHeader = Buffer.from([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x24, 0x00, 0x00, 0x00, // length
      0x57, 0x45, 0x42, 0x50, // WEBP
    ]);
    const res = validateImageMagicBytes(webpHeader);
    expect(res.valid).toBe(true);
    expect(res.mime).toBe('image/webp');
    expect(res.ext).toBe('webp');
  });

  it('rejects text, truncated, or non-image files', () => {
    const textBuffer = Buffer.from('Plain text file content');
    expect(validateImageMagicBytes(textBuffer).valid).toBe(false);

    const emptyBuffer = Buffer.alloc(0);
    expect(validateImageMagicBytes(emptyBuffer).valid).toBe(false);

    const shortBuffer = Buffer.from([0xff, 0xd8]);
    expect(validateImageMagicBytes(shortBuffer).valid).toBe(false);
  });
});
