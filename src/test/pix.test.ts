import { describe, expect, it } from "vitest";
import { createPixPayload } from "@/lib/pix";

describe("createPixPayload", () => {
  it("gera um payload BR Code com CRC", () => {
    const payload = createPixPayload("contato@example.com", "Igreja Teste", "Sao Carlos");
    expect(payload).toMatch(/^00020126/);
    expect(payload).toContain("BR.GOV.BCB.PIX");
    expect(payload).toContain("5303986");
    expect(payload).toMatch(/6304[0-9A-F]{4}$/);
  });
});
