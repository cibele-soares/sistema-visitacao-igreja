import { describe, expect, it } from "vitest";
import { generateAccessCode } from "@/lib/access-code";

describe("generateAccessCode", () => {
  it("gera um código com o tamanho solicitado e sem caracteres ambíguos", () => {
    const code = generateAccessCode(10);
    expect(code).toHaveLength(10);
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]+$/);
  });

  it("gera códigos diferentes", () => {
    expect(generateAccessCode()).not.toBe(generateAccessCode());
  });
});
