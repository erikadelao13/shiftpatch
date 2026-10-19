import { loginSchema } from "@/contracts/auth/schemas";
import { authenticate } from "@/server/auth/login";
import { errorResponse } from "@/server/errors";
import { readJson } from "@/server/http";

export async function POST(request: Request) {
  try {
    const { token, user } = await authenticate(loginSchema.parse(await readJson(request)));
    return Response.json({ token, user }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
