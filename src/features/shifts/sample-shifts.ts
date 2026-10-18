import type { AgencyShift } from "./types";

// Stand-in until shifts are persisted: the spec's seeded shifts, by agency.
export const sampleShiftsByAgency: Record<string, AgencyShift[]> = {
  "agency-a": [
    {
      id: "shift-1",
      role: "RN",
      date: "2026-10-02",
      startTime: "19:00",
      endTime: "07:00",
      status: "open",
      nurseName: null,
    },
    {
      id: "shift-2",
      role: "LPN",
      date: "2026-10-03",
      startTime: "07:00",
      endTime: "19:00",
      status: "filled",
      nurseName: "Maria Lopez",
    },
  ],
  "agency-b": [
    {
      id: "shift-3",
      role: "RN",
      date: "2026-10-04",
      startTime: "19:00",
      endTime: "07:00",
      status: "open",
      nurseName: null,
    },
  ],
};
