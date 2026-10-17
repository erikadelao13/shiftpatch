import { loginSchema } from "@/features/auth/schemas";
import { authenticate } from "@/features/auth/server/login";
import { errorResponse, HttpError } from "@/shared/server/errors";

export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new HttpError(400, "Request body must be valid JSON");
    }

    const { token, user } = await authenticate(loginSchema.parse(body));
    return Response.json({ token, user }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
