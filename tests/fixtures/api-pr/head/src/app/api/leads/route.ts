import { z } from "zod";

const LeadSchema = z.object({
  email: z.string().email(),
  source: z.string().min(1)
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = LeadSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "invalid_lead" }, { status: 422 });
  }

  return Response.json({ ok: true });
}
