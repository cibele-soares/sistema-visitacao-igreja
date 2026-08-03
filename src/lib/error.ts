export function errorMessage(error: unknown, fallback = "Não foi possível concluir a operação."): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error && "message" in error) return String(error.message);
  return fallback;
}
