import { z, type ZodError } from "zod";

import { SHIFT_ROLES } from "./types";

const TIME_PATTERN = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

export const newShiftSchema = z
  .object({
    role: z.enum(SHIFT_ROLES, "Role must be RN or LPN."),
    date: z.iso.date("Enter a valid date (YYYY-MM-DD)."),
    startTime: z
      .string("Enter a start time as HH:MM (24-hour).")
      .regex(TIME_PATTERN, "Enter a start time as HH:MM (24-hour)."),
    endTime: z
      .string("Enter an end time as HH:MM (24-hour).")
      .regex(TIME_PATTERN, "Enter an end time as HH:MM (24-hour)."),
  })
  .superRefine((shift, ctx) => {
    if (
      TIME_PATTERN.test(shift.startTime) &&
      shift.startTime === shift.endTime
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "End time must differ from the start time.",
      });
    }
  });

export type NewShiftInput = z.infer<typeof newShiftSchema>;

export type NewShiftErrors = Partial<Record<keyof NewShiftInput, string>>;

export function toFieldErrors(error: ZodError): NewShiftErrors {
  const errors: NewShiftErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof NewShiftInput | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}
