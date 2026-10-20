import { describe, expect, it } from "vitest";

import { initialsOf, plural } from "./text";

describe("plural", () => {
  it("keeps the noun singular for one", () => {
    expect(plural(1, "open shift")).toBe("1 open shift");
  });

  it("adds an s for zero and many", () => {
    expect(plural(0, "event")).toBe("0 events");
    expect(plural(3, "assigned shift")).toBe("3 assigned shifts");
  });
});

describe("initialsOf", () => {
  it("takes the first letter of the first two words", () => {
    expect(initialsOf("maria  lopez garcia")).toBe("ML");
  });

  it("handles a single name", () => {
    expect(initialsOf("Northside")).toBe("N");
  });
});
