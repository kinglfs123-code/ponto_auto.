// Traduz erros técnicos para mensagens amigáveis em português.
// Usar em todo `toast({ description: ... })` ao invés de err.message cru.

export function friendlyError(err: unknown, fallback = "Algo deu errado. Tente novamente em instantes."): string {
  if (!err) return fallback;

  // Strings diretas
  if (typeof err === "string") return mapMessage(err) || err || fallback;

  // Objetos de erro
  const anyErr = err as { message?: string; code?: string; error_description?: string; details?: string };
  const raw =
    anyErr.error_description ||
    anyErr.message ||
    anyErr.details ||
    (err instanceof Error ? err.message : "") ||
    "";

  const code = (anyErr.code || "").toString();

  // Códigos PostgREST/Postgres conhecidos
  if (code === "23505" || /duplicate key|already exists/i.test(raw)) {
    return "Este registro já existe.";
  }
  if (code === "23503" || /foreign key/i.test(raw)) {
    return "Não é possível excluir: existem itens vinculados a este registro.";
  }
  if (code === "22001" || /value too long/i.test(raw)) {
    return "Algum campo ultrapassou o limite de caracteres.";
  }
  if (code === "42501" || /permission denied|not authorized|unauthorized/i.test(raw)) {
    return "Você não tem permissão para esta ação.";
  }
  if (/jwt expired|invalid jwt|not authenticated|auth session missing/i.test(raw)) {
    return "Sua sessão expirou. Faça login novamente.";
  }

  return mapMessage(raw) || raw || fallback;
}

function mapMessage(raw: string): string | null {
  const s = raw.toLowerCase();

  if (/failed to fetch|network|networkerror|fetch failed|err_internet/i.test(s)) {
    return "Não foi possível conectar. Verifique sua internet e tente novamente.";
  }
  if (/timeout|timed out|etimedout/i.test(s)) {
    return "A operação demorou demais para responder. Tente novamente.";
  }
  if (/payload too large|file size|too large|exceeded/i.test(s)) {
    return "O arquivo é muito grande. O limite é 10MB.";
  }
  if (/invalid mime|invalid file type|not allowed/i.test(s)) {
    return "Tipo de arquivo não permitido.";
  }
  if (/validation failed|invalid input/i.test(s)) {
    return "Alguns campos estão incorretos. Verifique e tente novamente.";
  }
  if (/rate limit|too many requests/i.test(s)) {
    return "Muitas tentativas em pouco tempo. Aguarde um instante e tente novamente.";
  }
  return null;
}
