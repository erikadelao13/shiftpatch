import { expect, test, type APIRequestContext } from "@playwright/test";

import {
  accounts,
  createNurse,
  deleteOwnRows,
  sessionIdOf,
  PASSWORD,
  type ThrowawayNurse,
} from "./support";

const sessionIds: string[] = [];
const userIds: string[] = [];
const emails: string[] = [];

test.afterAll(async () => {
  await deleteOwnRows({ sessionIds, userIds, emails });
});

const agency = accounts[0].email;
const admin = accounts[4].email;

const farFuture = "2099-12-31";
const pdfBytes = Buffer.from("%PDF-1.7\nhello credential\n");

async function throwawayNurse(): Promise<ThrowawayNurse> {
  const nurse = await createNurse({ expiresOn: "2020-01-01" });
  userIds.push(nurse.id);
  emails.push(nurse.email);
  return nurse;
}

async function tokenFor(request: APIRequestContext, email: string) {
  const response = await request.post("/api/auth/login", { data: { email, password: PASSWORD } });
  const body = await response.json();
  const sid = sessionIdOf(body.token);
  if (sid) sessionIds.push(sid);
  return body.token as string;
}

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

function upload(buffer: Buffer, expiresOn: string, name = "license.pdf", mimeType = "application/pdf") {
  return { multipart: { file: { name, mimeType, buffer }, expiresOn } };
}

test("rejects requests without authentication", async ({ request }) => {
  const post = await request.post("/api/credentials", upload(pdfBytes, farFuture));
  expect(post.status()).toBe(401);
  expect(post.headers()["cache-control"]).toBe("no-store");
  expect((await request.get("/api/credentials/document")).status()).toBe(401);
});

test("refuses an agency and the admin", async ({ request }) => {
  for (const email of [agency, admin]) {
    const headers = bearer(await tokenFor(request, email));
    const post = await request.post("/api/credentials", { headers, ...upload(pdfBytes, farFuture) });
    expect(post.status()).toBe(403);
    expect(await post.json()).toEqual({ error: "Only nurses can upload credentials" });
    const get = await request.get("/api/credentials/document", { headers });
    expect(get.status()).toBe(403);
    expect(await get.json()).toEqual({ error: "Only nurses can view credential documents" });
  }
});

test("answers every rejection with an error body and saves nothing", async ({ request }) => {
  const nurse = await throwawayNurse();
  const headers = bearer(await tokenFor(request, nurse.email));
  const expectError = async (
    response: Awaited<ReturnType<APIRequestContext["post"]>>,
    status: number,
    error: string,
  ) => {
    expect(response.status()).toBe(status);
    expect(response.headers()["cache-control"]).toBe("no-store");
    expect(await response.json()).toEqual({ error });
  };

  await expectError(
    await request.post("/api/credentials", {
      headers,
      ...upload(Buffer.alloc(5 * 1024 * 1024, 1), farFuture),
    }),
    413,
    "Choose a file of 4 MB or less.",
  );
  await expectError(
    await request.post("/api/credentials", { headers, data: { expiresOn: farFuture } }),
    400,
    "Send the document and expiry date as multipart/form-data.",
  );
  await expectError(
    await request.post("/api/credentials", { headers, multipart: { expiresOn: farFuture } }),
    400,
    "Choose your credential document.",
  );
  await expectError(
    await request.post("/api/credentials", { headers, ...upload(pdfBytes, "") }),
    400,
    "Enter the expiry date printed on your document.",
  );
  await expectError(
    await request.post("/api/credentials", { headers, ...upload(pdfBytes, "2020-01-01") }),
    400,
    "Expiry date must be today or later.",
  );
  await expectError(
    await request.post("/api/credentials", {
      headers,
      ...upload(Buffer.from("<html></html>"), farFuture),
    }),
    400,
    "Choose a PDF, JPG or PNG file.",
  );

  const document = await request.get("/api/credentials/document", { headers });
  await expectError(document, 404, "No document on file");
});

test("saves a credential and serves the same bytes back to its owner", async ({ request }) => {
  const nurse = await throwawayNurse();
  const headers = bearer(await tokenFor(request, nurse.email));

  const post = await request.post("/api/credentials", {
    headers,
    ...upload(pdfBytes, farFuture, "Licença é.pdf"),
  });
  expect(post.status()).toBe(200);
  expect(post.headers()["cache-control"]).toBe("no-store");
  const body = await post.json();
  expect(Object.keys(body).sort()).toEqual(["document", "expiresOn", "nurseId", "status"]);
  expect(Object.keys(body.document).sort()).toEqual([
    "contentType",
    "fileName",
    "sizeBytes",
    "uploadedAt",
  ]);
  expect(body).toMatchObject({
    nurseId: nurse.id,
    expiresOn: farFuture,
    status: "valid",
    document: { fileName: "Licença é.pdf", contentType: "application/pdf", sizeBytes: pdfBytes.length },
  });

  const get = await request.get("/api/credentials/document", { headers });
  expect(get.status()).toBe(200);
  expect(Buffer.from(await get.body()).equals(pdfBytes)).toBe(true);
  expect(get.headers()["content-type"]).toBe("application/pdf");
  expect(get.headers()["content-disposition"]).toContain("filename*=UTF-8''Licen%C3%A7a%20%C3%A9.pdf");
  expect(get.headers()["x-content-type-options"]).toBe("nosniff");
  expect(get.headers()["cache-control"]).toBe("private, no-store");
});
