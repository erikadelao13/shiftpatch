import { z } from "zod";

// Emails are matched case-insensitively. An unknown or malformed address gets
// the same 401 as a wrong password, so only missing fields are a 400.
export const loginSchema = z.object({
  email: z
    .string({ error: "Email and password are required" })
    .trim()
    .toLowerCase()
    .min(1, "Email and password are required")
    .max(254, "Email is too long"),
  // Bounded so a huge password can't be used to burn scrypt time.
  password: z
    .string({ error: "Email and password are required" })
    .min(1, "Email and password are required")
    .max(1024, "Password is too long"),
});

export type LoginInput = z.infer<typeof loginSchema>;
