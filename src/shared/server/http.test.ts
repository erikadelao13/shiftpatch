import { describe, expect, it } from "vitest";

import { HttpError } from "./errors";
import { assertContentLength, readFormData } from "./http";

function post(body: BodyInit, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/credentials", { method: "POST", body, headers });
}

describe("assertContentLength", () => {
  it("rejects a declared length over the limit with 413", () => {
    const request = post("x", { "content-length": "1001" });
    expect(() => assertContentLength(request, 1000)).toThrow(HttpError);
    try {
      assertContentLength(request, 1000);
    } catch (error) {
      expect((error as HttpError).status).toBe(413);
    }
  });

  it("accepts a length at the limit, a missing header and a malformed one", () => {
    expect(() => assertContentLength(post("x", { "content-length": "1000" }), 1000)).not.toThrow();
    expect(() => assertContentLength(post("x"), 1000)).not.toThrow();
    expect(() => assertContentLength(post("x", { "content-length": "abc" }), 1000)).not.toThrow();
  });
});

describe("readFormData", () => {
  it("parses a multipart body", async () => {
    const form = new FormData();
    form.set("expiresOn", "2027-01-01");
    const parsed = await readFormData(post(form));
    expect(parsed.get("expiresOn")).toBe("2027-01-01");
  });

  it("rejects a JSON body with 400", async () => {
    const request = post("{}", { "content-type": "application/json" });
    await expect(readFormData(request)).rejects.toMatchObject({
      status: 400,
      message: "Send the document and expiry date as multipart/form-data.",
    });
  });

  it("rejects a body with no content type", async () => {
    await expect(readFormData(post(new Uint8Array([1, 2, 3])))).rejects.toBeInstanceOf(HttpError);
  });
});
