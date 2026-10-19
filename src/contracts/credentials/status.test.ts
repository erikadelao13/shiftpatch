import { describe, expect, it } from "vitest";

import { getCredentialStatus, todayIsoDate } from "./status";

describe("getCredentialStatus", () => {
  it("is valid the day before expiry", () => {
    expect(getCredentialStatus("2027-01-01", "2026-12-31").state).toBe("valid");
  });

  it("is valid on the expiry date itself", () => {
    expect(getCredentialStatus("2027-01-01", "2027-01-01").state).toBe("valid");
  });

  it("is expired the day after expiry", () => {
    expect(getCredentialStatus("2026-06-01", "2026-06-02")).toEqual({
      state: "expired",
      expiresOn: "2026-06-01",
    });
  });

  it("is missing without an expiry date", () => {
    expect(getCredentialStatus(null, "2026-10-17")).toEqual({ state: "missing" });
  });
});

describe("todayIsoDate", () => {
  it("formats the UTC calendar date", () => {
    expect(todayIsoDate(new Date("2026-10-17T23:30:00Z"))).toBe("2026-10-17");
  });
});
