import { describe, expect, it } from "vitest";
import { classifyFile } from "../src/analyzers/changed-files.js";

describe("changed file analyzer", () => {
  it("classifies form components", () => {
    const surfaces = classifyFile(
      { path: "src/components/SignupForm.tsx", status: "modified" },
      `export function SignupForm(){ return <form onSubmit={() => {}}><input name="email" /></form>; }`
    );

    expect(surfaces.map((surface) => surface.kind)).toEqual(expect.arrayContaining(["component", "form"]));
  });

  it("classifies Next API routes and auth signals", () => {
    const surfaces = classifyFile(
      { path: "app/api/orders/[id]/route.ts", status: "modified" },
      `export async function GET(req: Request){ const session = await auth(); return Response.json({}); }`
    );

    expect(surfaces.map((surface) => surface.kind)).toEqual(expect.arrayContaining(["api", "auth"]));
  });

  it("classifies dependency updates", () => {
    const surfaces = classifyFile({ path: "pnpm-lock.yaml", status: "modified" });

    expect(surfaces.map((surface) => surface.kind)).toContain("dependency");
  });
});
