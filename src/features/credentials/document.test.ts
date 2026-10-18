import { describe, expect, it } from "vitest";

import {
  cleanFileName,
  contentDisposition,
  detectDocumentType,
  formatFileSize,
} from "./document";

const bytes = (...values: number[]) => Uint8Array.from(values);
const ascii = (text: string) => new TextEncoder().encode(text);

describe("detectDocumentType", () => {
  it("recognises a PDF", () => {
    expect(detectDocumentType(ascii("%PDF-1.7\n"))).toBe("pdf");
  });

  it("recognises a JPEG", () => {
    expect(detectDocumentType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("jpeg");
  });

  it("recognises a PNG", () => {
    expect(detectDocumentType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe("png");
  });

  it("rejects empty, truncated and HTML bytes", () => {
    expect(detectDocumentType(bytes())).toBeNull();
    expect(detectDocumentType(ascii("%PDF"))).toBeNull();
    expect(detectDocumentType(bytes(0xff, 0xd8))).toBeNull();
    expect(detectDocumentType(bytes(0x89, 0x50, 0x4e, 0x47))).toBeNull();
    expect(detectDocumentType(ascii("<html><body>%PDF-</body></html>"))).toBeNull();
  });
});

describe("cleanFileName", () => {
  it("keeps the basename of a path", () => {
    expect(cleanFileName("C:\\Users\\me\\license.pdf", "pdf")).toBe("license.pdf");
    expect(cleanFileName("../../etc/license.pdf", "pdf")).toBe("license.pdf");
  });

  it("strips control characters and trims", () => {
    expect(cleanFileName("  li\r\ncense\u0000.pdf ", "pdf")).toBe("license.pdf");
  });

  it("caps the name at 255 characters", () => {
    expect(Array.from(cleanFileName("a".repeat(300), "pdf"))).toHaveLength(255);
  });

  it("falls back to a name built from the detected type", () => {
    expect(cleanFileName("", "pdf")).toBe("credential.pdf");
    expect(cleanFileName("folder/", "jpeg")).toBe("credential.jpg");
    expect(cleanFileName("\u0007\u0008", "png")).toBe("credential.png");
  });
});

describe("contentDisposition", () => {
  it("quotes an ASCII name", () => {
    expect(contentDisposition("license.pdf")).toBe(
      `attachment; filename="license.pdf"; filename*=UTF-8''license.pdf`,
    );
  });

  it("keeps non-ASCII characters out of the plain filename", () => {
    const header = contentDisposition("licença é.pdf");
    expect(header).toContain(`filename="licen_a _.pdf"`);
    expect(header).toContain("filename*=UTF-8''licen%C3%A7a%20%C3%A9.pdf");
    expect(() => new Headers({ "Content-Disposition": header })).not.toThrow();
  });

  it("handles CJK names", () => {
    const header = contentDisposition("免許証.pdf");
    expect(header).toContain(`filename="___.pdf"`);
    expect(header).toContain("filename*=UTF-8''%E5%85%8D%E8%A8%B1%E8%A8%BC.pdf");
  });

  it("cannot break out of the quoted string", () => {
    const header = contentDisposition(`a"b\\c%d'e.pdf`);
    expect(header).toContain(`filename="a_b_c_d'e.pdf"`);
    expect(header).toContain("filename*=UTF-8''a%22b%5Cc%25d%27e.pdf");
  });
});

describe("formatFileSize", () => {
  it("rounds to KB below 1 MB, never showing 0 KB", () => {
    expect(formatFileSize(1)).toBe("1 KB");
    expect(formatFileSize(2048)).toBe("2 KB");
  });

  it("shows MB with one decimal from 1 MB", () => {
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
    expect(formatFileSize(4 * 1024 * 1024)).toBe("4.0 MB");
  });
});
