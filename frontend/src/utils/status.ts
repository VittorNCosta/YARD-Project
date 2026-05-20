export function statusToSlug(status: string): string {
  return status
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");
}

export type BadgeVariant =
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "neutral";

export function statusToVariant(status: string): BadgeVariant {
  const slug = statusToSlug(status);

  if (slug === "ativo" || slug === "finalizado-ok") return "success";
  if (slug === "inativo") return "danger";
  if (slug === "fila" || slug.startsWith("aguardando")) return "warning";
  if (slug === "patio" || slug.startsWith("doca")) return "info";
  return "neutral";
}
