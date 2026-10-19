import { describe, expect, it } from "vitest";

import { credentialFileSchema, credentialUploadSchema, MAX_CREDENTIAL_BYTES } from "./schemas";

function fileOf(name: string, type: string, size = 1024): File {
  return new File([new Uint8Array(size)], name, { type });
}

function firstMessage(value: unknown): string | undefined {
  const parsed = credentialFileSchema.safeParse(value);
  return parsed.success ? undefined : parsed.error.issues[0]?.message;
}

describe("credentialFileSchema", () => {
  it.each([
    ["license.pdf", "application/pdf"],
    ["license.jpg", "image/jpeg"],
    ["license.png", "image/png"],
  ])("accepts %s", (name, type) => {
    expect(firstMessage(fileOf(name, type))).toBeUndefined();
  });

  it("asks for a document when the input is empty", () => {
    expect(firstMessage(new File([], "", { type: "application/octet-stream" }))).toBe(
      "Choose your credential document.",
    );
    expect(firstMessage(null)).toBe("Choose your credential document.");
  });

  it("rejects an empty file", () => {
    expect(firstMessage(fileOf("license.pdf", "application/pdf", 0))).toBe(
      "This file is empty. Choose your credential document.",
    );
  });

  it("rejects an unsupported type", () => {
    expect(firstMessage(fileOf("license.docx", "application/msword"))).toBe(
      "Choose a PDF, JPG or PNG file.",
    );
  });

  it("accepts a file at the size limit and rejects one byte more", () => {
    expect(firstMessage(fileOf("license.pdf", "application/pdf", MAX_CREDENTIAL_BYTES))).toBeUndefined();
    expect(firstMessage(fileOf("license.pdf", "application/pdf", MAX_CREDENTIAL_BYTES + 1))).toBe(
      "Choose a file of 4 MB or less.",
    );
  });
});

describe("credentialUploadSchema", () => {
  it("requires a calendar expiry date", () => {
    const file = fileOf("license.pdf", "application/pdf");
    expect(credentialUploadSchema.safeParse({ file, expiresOn: "2027-01-01" }).success).toBe(true);
    expect(credentialUploadSchema.safeParse({ file, expiresOn: "" }).success).toBe(false);
    expect(credentialUploadSchema.safeParse({ file, expiresOn: "2027-02-30" }).success).toBe(false);
  });
});
