// The spec's sample data (docs/ShiftPatch-Technical-Spec.md), exactly.
// The shared password is a public fixture, not a secret.
export const FIXTURE_PASSWORD = "Trial2026!";

export const fixtureAgencies = [
  { id: "agency-a", name: "Sunrise Health Staffing" },
  { id: "agency-b", name: "Metro Care Partners" },
] as const;

export const fixtureUsers = [
  {
    id: "agency-a",
    email: "admin@sunrisehealth.example",
    name: "Sunrise Health Staffing",
    role: "agency",
    agencyId: "agency-a",
  },
  {
    id: "agency-b",
    email: "admin@metrocare.example",
    name: "Metro Care Partners",
    role: "agency",
    agencyId: "agency-b",
  },
  {
    id: "nurse-1",
    email: "maria.lopez@example.com",
    name: "Maria Lopez",
    role: "nurse",
    agencyId: null,
  },
  {
    id: "nurse-2",
    email: "james.cook@example.com",
    name: "James Cook",
    role: "nurse",
    agencyId: null,
  },
  {
    id: "admin-1",
    email: "alex.kim@example.com",
    name: "Alex Kim",
    role: "admin",
    agencyId: null,
  },
] as const;
