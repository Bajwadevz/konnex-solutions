import { ZodError, type ZodType } from "zod";

export function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export function error(message: string, status = 400) {
  return json({ error: message }, status);
}

export async function readJson(req: Request) {
  try {
    return (await req.json()) as unknown;
  } catch {
    return {};
  }
}

export function parseBody<T>(schema: ZodType<T>, body: unknown): { ok: true; data: T } | { ok: false; error: string } {
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { ok: false, error: formatZod(parsed.error) };
  return { ok: true, data: parsed.data };
}

export function formatZod(error: ZodError) {
  return error.issues.map((issue) => issue.message).join("; ");
}
