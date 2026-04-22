import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import { friendlyError } from "@/lib/error-messages";
import NavBar from "@/components/NavBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SpinnerButton } from "@/components/ui/spinner-button";
import { ToastAction } from "@/components/ui/toast";
import {
  ArrowLeft, Mail, Briefcase, Cake, Clock, FileText, Upload, Trash2, Download, Send, Plus, Calendar, Loader2, Pencil,
} from "lucide-react";
import { maskCPF, maskCpfSensitive, maskEmailSensitive, validateCPF, validateEmail } from "@/lib/ponto-rules";
import { SensitiveText } from "@/components/SensitiveText";
import { cn } from "@/lib/utils";
import type { Funcionario, Folha, Holerite, FuncionarioDocumento, CategoriaDocumento, FuncionarioFerias, StatusFerias } from "@/types";
import { AnaliseContrato } from "@/components/AnaliseContrato";

const CATEGORIAS: { value: CategoriaDocumento; label: string }[] = [
  { value: "contrato", label: "Contrato de Trabalho" },
  { value: "epi", label: "Ficha de EPI" },
  { value: "aso", label: "ASO" },
  { value: "outros", label: "Outros" },
];

const STATUS_FERIAS: { value: StatusFerias; label: string; color: string }[] = [
  { value: "planejada", label: "Planejada", color: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  { value: "em_andamento", label: "Em andamento", color: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  { value: "concluida", label: "Concluída", color: "bg-green-500/15 text-green-600 border-green-500/30" },
];

const formatDate = (d?: string | null) => {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

const formatMes = (m: string) => {
  const [y, mm] = m.split("-");
  return `${mm}/${y}`;
};

const initials = (nome: string) =>
  nome.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

type EditForm = {
  nome_completo: string;
  cpf: string;
  email: string;
  cargo: string;
  data_nascimento: string;
  horario_entrada: string;
  horario_saida: string;
  intervalo: string;
};

export default function FuncionarioDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [func, setFunc] = useState<Funcionario | null>(null);
  const [folhas, setFolhas] = useState<Folha[]>([]);
  const [holerites, setHolerites] = useState<Holerite[]>([]);
  const [documentos, setDocumentos] = useState<FuncionarioDocumento[]>([]);
  const [ferias, setFerias] = useState<FuncionarioFerias[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTouched, setEditTouched] = useState<{ nome_completo?: boolean; cpf?: boolean; email?: boolean }>({});
  const [uploadingCat, setUploadingCat] = useState<CategoriaDocumento | null>(null);

  // Holerite upload
  const [holeriteMes, setHoleriteMes] = useState(currentMonth());
  const [uploadingHolerite, setUploadingHolerite] = useState(false);
  const holeriteInputRef = useRef<HTMLInputElement>(null);

  // Folha
  const [folhaMes, setFolhaMes] = useState(currentMonth());
  const [creatingFolha, setCreatingFolha] = useState(false);

  // Edit funcionario
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    nome_completo: "", cpf: "", email: "", cargo: "", data_nascimento: "",
    horario_entrada: "", horario_saida: "", intervalo: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Férias form (criar/editar)
  const [showFeriasForm, setShowFeriasForm] = useState(false);
  const [editingFeriasId, setEditingFeriasId] = useState<string | null>(null);
  const [feriasForm, setFeriasForm] = useState({ data_inicio: "", data_fim: "", status: "planejada" as StatusFerias, observacao: "" });
  const [feriasFile, setFeriasFile] = useState<File | null>(null);
  const [feriasRemoveDoc, setFeriasRemoveDoc] = useState(false);
  const [savingFerias, setSavingFerias] = useState(false);
  const [syncingFeriasId, setSyncingFeriasId] = useState<string | null>(null);
  const feriasFileInputRef = useRef<HTMLInputElement>(null);

  // Conexão Google (para sync de férias)
  const [googleConnected, setGoogleConnected] = useState(false);
  useEffect(() => {
    supabase.from("google_calendar_tokens").select("scope").maybeSingle().then(({ data }) => {
      setGoogleConnected(!!data && (data.scope || "").includes("calendar.events"));
    });
  }, []);

  const loadAll = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data: fData, error: fErr } = await supabase
      .from("funcionarios")
      .select("id, empresa_id, nome_completo, cpf, email, data_nascimento, cargo, horario_entrada, horario_saida, intervalo")
      .eq("id", id)
      .maybeSingle();
    if (fErr || !fData) {
      toast({ title: "Colaborador não encontrado", variant: "destructive" });
      setLoading(false);
      return;
    }
    setFunc(fData as Funcionario);

    const [folhasRes, holRes, docsRes, ferRes] = await Promise.all([
      supabase
        .from("folhas_ponto")
        .select("id, funcionario, mes_referencia, status, empresa_id")
        .eq("funcionario_id", id)
        .order("mes_referencia", { ascending: false })
        .limit(50),
      supabase
        .from("holerites")
        .select("id, funcionario_id, mes_referencia, pdf_path, enviado, enviado_em")
        .eq("funcionario_id", id)
        .order("mes_referencia", { ascending: false })
        .limit(50),
      supabase
        .from("funcionario_documentos")
        .select("id, funcionario_id, empresa_id, categoria, nome_arquivo, storage_path, mime_type, tamanho_bytes, created_at")
        .eq("funcionario_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("funcionario_ferias")
        .select("id, funcionario_id, empresa_id, data_inicio, data_fim, dias, status, observacao, documento_storage_path, documento_nome, google_event_id, google_event_id_inicio, google_event_id_fim, created_at")
        .eq("funcionario_id", id)
        .order("data_inicio", { ascending: false })
        .limit(50),
    ]);

    setFolhas((folhasRes.data as Folha[]) || []);
    setHolerites((holRes.data as Holerite[]) || []);
    setDocumentos((docsRes.data as FuncionarioDocumento[]) || []);
    setFerias((ferRes.data as FuncionarioFerias[]) || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Detecta retorno do OAuth com erro de escopo faltando
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google") === "error" && params.get("reason") === "missing_scopes") {
      const missing = params.get("missing") || "";
      toast({
        title: "Permissões do Google faltando",
        description: missing.includes("gmail.send")
          ? "O escopo de envio de e-mail (gmail.send) não foi concedido. Habilite a Gmail API no Google Cloud Console e reconecte."
          : `Escopos faltando: ${missing}. Reconecte e autorize todas as permissões.`,
        variant: "destructive",
      });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("google") === "ok") {
      toast({ title: "Google conectado!" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // ==== Documentos ====
  const handleUploadDoc = async (categoria: CategoriaDocumento, file: File) => {
    if (!func) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 10MB", variant: "destructive" });
      return;
    }
    setUploadingCat(categoria);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${func.empresa_id}/${func.id}/${categoria}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("colaborador-arquivos").upload(path, file);
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("funcionario_documentos").insert({
        funcionario_id: func.id,
        empresa_id: func.empresa_id,
        categoria,
        nome_arquivo: file.name,
        storage_path: path,
        mime_type: file.type,
        tamanho_bytes: file.size,
      });
      if (insErr) throw insErr;
      toast({ title: "Documento anexado" });
      await loadAll();
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploadingCat(null);
    }
  };

  const handleUploadContratos = async (files: File[]) => {
    if (!func || files.length === 0) return;
    for (const f of files) {
      if (f.size > 10 * 1024 * 1024) {
        toast({ title: "Arquivo muito grande", description: `${f.name} excede 10MB`, variant: "destructive" });
        return;
      }
    }
    setUploadingCat("contrato");
    const novosIds: string[] = [];
    try {
      for (const file of files) {
        const ext = file.name.split(".").pop() || "bin";
        const path = `${func.empresa_id}/${func.id}/contrato/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("colaborador-arquivos").upload(path, file);
        if (upErr) throw upErr;
        const { data: inserted, error: insErr } = await supabase
          .from("funcionario_documentos")
          .insert({
            funcionario_id: func.id,
            empresa_id: func.empresa_id,
            categoria: "contrato",
            nome_arquivo: file.name,
            storage_path: path,
            mime_type: file.type,
            tamanho_bytes: file.size,
          })
          .select("id")
          .single();
        if (insErr) throw insErr;
        if (inserted?.id) novosIds.push(inserted.id);
      }
      toast({ title: `${files.length} arquivo(s) anexado(s)`, description: `Analisando ${files.length} arquivo(s) do contrato com IA…` });
      await loadAll();
      // O AnaliseContrato vai auto-disparar a análise consolidada com todos os contratos.
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploadingCat(null);
    }
  };

  const handleDownloadDoc = async (doc: FuncionarioDocumento) => {
    const { data, error } = await supabase.storage.from("colaborador-arquivos").createSignedUrl(doc.storage_path, 60);
    if (error || !data) {
      toast({ title: "Erro", description: error?.message, variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const handleDeleteDoc = async (doc: FuncionarioDocumento) => {
    const ok = await confirm({
      title: "Excluir documento",
      description: `Tem certeza que deseja excluir "${doc.nome_arquivo}"? Esta ação não pode ser desfeita.`,
      confirmLabel: "Excluir documento",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await supabase.storage.from("colaborador-arquivos").remove([doc.storage_path]);
      const { error } = await supabase.from("funcionario_documentos").delete().eq("id", doc.id);
      if (error) throw error;

      // Se for um contrato e não restarem mais contratos, limpar análise + alertas + eventos no Google Agenda
      if (doc.categoria === "contrato" && func) {
        const restantes = documentos.filter(
          (d) => d.id !== doc.id && d.categoria === "contrato",
        );
        if (restantes.length === 0) {
          const { data: alertasAntigos } = await supabase
            .from("contrato_alertas")
            .select("google_event_id, google_event_id_lembrete, google_event_id_vencimento")
            .eq("funcionario_id", func.id);
          const eventIds = (alertasAntigos ?? [])
            .flatMap((a) => [a.google_event_id, a.google_event_id_lembrete, a.google_event_id_vencimento])
            .filter((x): x is string => typeof x === "string" && x.length > 0);

          if (eventIds.length > 0) {
            try {
              await supabase.functions.invoke("delete-calendar-alerts", {
                body: { event_ids: eventIds },
              });
            } catch {
              // best-effort
            }
          }

          await supabase.from("contrato_alertas").delete().eq("funcionario_id", func.id);
          await supabase.from("contratos_analise").delete().eq("funcionario_id", func.id);
        }
      }

      toast({ title: "Documento excluído" });
      await loadAll();
    } catch (err) {
      toast({ title: "Erro ao excluir", description: friendlyError(err), variant: "destructive" });
    }
  };

  // ==== Holerites ====
  const handleUploadHolerite = async (file: File) => {
    if (!func) return;
    if (file.type !== "application/pdf") {
      toast({ title: "Erro", description: "Selecione um arquivo PDF", variant: "destructive" });
      return;
    }
    if (!holeriteMes) {
      toast({ title: "Selecione o mês", variant: "destructive" });
      return;
    }
    setUploadingHolerite(true);
    try {
      const path = `${func.empresa_id}/${holeriteMes}/${func.id}.pdf`;
      const { error: upErr } = await supabase.storage.from("holerites").upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const existing = holerites.find((h) => h.mes_referencia === holeriteMes);
      if (existing) {
        await supabase.from("holerites").update({ pdf_path: path, enviado: false, enviado_em: null }).eq("id", existing.id);
      } else {
        await supabase.from("holerites").insert({
          empresa_id: func.empresa_id,
          funcionario_id: func.id,
          mes_referencia: holeriteMes,
          pdf_path: path,
        });
      }
      toast({ title: "Holerite anexado" });
      await loadAll();
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploadingHolerite(false);
    }
  };

  const handleDownloadHolerite = async (h: Holerite) => {
    const { data, error } = await supabase.storage.from("holerites").createSignedUrl(h.pdf_path, 60);
    if (error || !data) {
      toast({ title: "Erro", description: error?.message, variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const startGoogleConnect = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("google-oauth-start", {
        body: { return_to: window.location.pathname, origin: window.location.origin },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("URL não retornada");
      window.location.href = data.url as string;
    } catch (err: any) {
      toast({ title: "Erro", description: err?.message || "Falha ao iniciar conexão", variant: "destructive" });
    }
  };

  // Envio por e-mail acontece apenas na aba Holerites.

  const handleSendHolerite = async (h: Holerite) => {
    if (!func?.email) {
      toast({ title: "Sem e-mail cadastrado", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase.functions.invoke("send-via-gmail", {
      body: { kind: "holerite", holerite_id: h.id },
    });
    if (error) {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
      return;
    }
    if (data?.needs_connection || data?.needs_reconnect) {
      const reason = data.reason as string | undefined;
      const description =
        data?.error ||
        (reason === "no_token"
          ? "Conecte sua conta Google para enviar e-mails."
          : reason === "refresh_revoked"
          ? "Sua autorização Google expirou. Reconecte para continuar."
          : reason === "missing_scope" || reason === "scope_insufficient"
          ? "Permissão de envio de e-mail não concedida. Reconecte e autorize 'Enviar e-mails'."
          : "Necessário autorizar envio de e-mail pelo seu Gmail.");
      toast({
        title: reason === "no_token" ? "Conecte o Google" : "Reconecte o Google",
        description,
        variant: "destructive",
        action: (
          <ToastAction altText="Reconectar Google" onClick={() => startGoogleConnect()}>
            Reconectar Google
          </ToastAction>
        ),
      });
      return;
    }
    if (data?.rate_limited) {
      toast({ title: "Limite atingido", description: data.error, variant: "destructive" });
      return;
    }
    if (data?.error) {
      toast({ title: "Erro ao enviar", description: data.error, variant: "destructive" });
      return;
    }
    toast({ title: "Holerite enviado!" });
    await loadAll();
  };

  const handleDeleteHolerite = async (h: Holerite) => {
    const ok = await confirm({
      title: "Excluir holerite",
      description: `Tem certeza que deseja excluir o holerite de ${formatMes(h.mes_referencia)}? Esta ação não pode ser desfeita.`,
      confirmLabel: "Excluir holerite",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await supabase.storage.from("holerites").remove([h.pdf_path]);
      const { error } = await supabase.from("holerites").delete().eq("id", h.id);
      if (error) throw error;
      toast({ title: "Holerite excluído" });
      await loadAll();
    } catch (err) {
      toast({ title: "Erro ao excluir", description: friendlyError(err), variant: "destructive" });
    }
  };

  // ==== Folhas ====
  const handleNovaFolha = async () => {
    if (!func) return;
    if (!folhaMes) { toast({ title: "Selecione o mês", variant: "destructive" }); return; }
    const existing = folhas.find((f) => f.mes_referencia === folhaMes);
    if (existing) {
      navigate(`/ponto/${existing.id}`);
      return;
    }
    setCreatingFolha(true);
    try {
      const { data, error } = await supabase.from("folhas_ponto").insert({
        empresa_id: func.empresa_id,
        funcionario_id: func.id,
        funcionario: func.nome_completo,
        mes_referencia: folhaMes,
        status: "rascunho",
      }).select("id").single();
      if (error) throw error;
      navigate(`/ponto/${data.id}`);
    } catch (err: any) {
      toast({ title: "Erro ao criar folha", description: err.message, variant: "destructive" });
    } finally {
      setCreatingFolha(false);
    }
  };

  const handleDeleteFolha = async (f: Folha) => {
    const ok = await confirm({
      title: "Excluir folha de ponto",
      description: `Tem certeza que deseja excluir a folha de ${formatMes(f.mes_referencia)}? Todos os registros serão removidos. Esta ação não pode ser desfeita.`,
      confirmLabel: "Excluir folha",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await supabase.from("registros_ponto").delete().eq("folha_id", f.id);
      const { error } = await supabase.from("folhas_ponto").delete().eq("id", f.id);
      if (error) throw error;
      toast({ title: "Folha excluída" });
      await loadAll();
    } catch (err) {
      toast({ title: "Erro ao excluir", description: friendlyError(err), variant: "destructive" });
    }
  };

  // ==== Editar funcionário ====
  const openEdit = () => {
    if (!func) return;
    setEditForm({
      nome_completo: func.nome_completo || "",
      cpf: func.cpf || "",
      email: func.email || "",
      cargo: func.cargo || "",
      data_nascimento: func.data_nascimento || "",
      horario_entrada: func.horario_entrada || "08:00",
      horario_saida: func.horario_saida || "17:00",
      intervalo: func.intervalo || "01:00",
    });
    setEditOpen(true);
  };

  const editErrors = (() => {
    const e: { nome_completo?: string; cpf?: string; email?: string } = {};
    if (!editForm.nome_completo.trim()) e.nome_completo = "Informe o nome completo.";
    if (!editForm.cpf || !validateCPF(editForm.cpf)) e.cpf = "CPF inválido. Verifique os dígitos.";
    if (editForm.email && !validateEmail(editForm.email)) e.email = "E-mail inválido.";
    return e;
  })();

  const handleSaveEdit = async () => {
    if (!func) return;
    setEditTouched({ nome_completo: true, cpf: true, email: true });
    if (Object.keys(editErrors).length > 0) {
      toast({ title: "Verifique os campos", description: "Alguns dados estão incorretos.", variant: "destructive" });
      return;
    }
    setSavingEdit(true);
    try {
      const { error } = await supabase.from("funcionarios").update({
        nome_completo: editForm.nome_completo.trim(),
        cpf: editForm.cpf.replace(/\D/g, ""),
        email: editForm.email.trim() || null,
        cargo: editForm.cargo.trim() || null,
        data_nascimento: editForm.data_nascimento || null,
        horario_entrada: editForm.horario_entrada,
        horario_saida: editForm.horario_saida,
        intervalo: editForm.intervalo,
      }).eq("id", func.id);
      if (error) throw error;
      toast({ title: "Dados atualizados" });
      setEditOpen(false);
      setEditTouched({});
      await loadAll();
    } catch (err) {
      toast({ title: "Erro ao salvar", description: friendlyError(err), variant: "destructive" });
    } finally {
      setSavingEdit(false);
    }
  };

  // ==== Férias ====
  const calcDias = (ini: string, fim: string) => {
    if (!ini || !fim) return 0;
    const a = new Date(ini); const b = new Date(fim);
    return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000) + 1);
  };

  const openNewFerias = () => {
    setEditingFeriasId(null);
    setFeriasForm({ data_inicio: "", data_fim: "", status: "planejada", observacao: "" });
    setFeriasFile(null);
    setFeriasRemoveDoc(false);
    setShowFeriasForm(true);
  };

  const openEditFerias = (fr: FuncionarioFerias) => {
    setEditingFeriasId(fr.id);
    setFeriasForm({
      data_inicio: fr.data_inicio,
      data_fim: fr.data_fim,
      status: fr.status as StatusFerias,
      observacao: fr.observacao || "",
    });
    setFeriasFile(null);
    setFeriasRemoveDoc(false);
    setShowFeriasForm(true);
  };

  const trySyncFeriasCalendar = async (ferias_id: string, silent = false) => {
    try {
      const { data, error } = await supabase.functions.invoke("sync-ferias-calendar", {
        body: { ferias_id },
      });
      if (error) throw error;
      if (data?.needs_connection) {
        if (!silent) {
          toast({
            title: "Conecte o Google Agenda",
            description: "Necessário para criar o evento de férias.",
            variant: "destructive",
          });
          startGoogleConnect();
        }
        return false;
      }
      if (data?.error) throw new Error(data.error);
      if (!silent) toast({ title: "Evento criado no Google Agenda" });
      return true;
    } catch (err: any) {
      if (!silent) toast({ title: "Erro ao sincronizar agenda", description: err?.message, variant: "destructive" });
      return false;
    }
  };

  const handleSaveFerias = async () => {
    if (!func) return;
    if (!feriasForm.data_inicio || !feriasForm.data_fim) {
      toast({ title: "Datas obrigatórias", variant: "destructive" }); return;
    }
    const dias = calcDias(feriasForm.data_inicio, feriasForm.data_fim);
    if (dias <= 0) { toast({ title: "Período inválido", variant: "destructive" }); return; }
    if (feriasFile && feriasFile.size > 10 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 10MB", variant: "destructive" });
      return;
    }

    setSavingFerias(true);
    try {
      const ferias_id = editingFeriasId || crypto.randomUUID();
      const existing = editingFeriasId ? ferias.find((f) => f.id === editingFeriasId) : null;

      let documento_storage_path: string | null = existing?.documento_storage_path ?? null;
      let documento_nome: string | null = existing?.documento_nome ?? null;

      // Remoção solicitada
      if (feriasRemoveDoc && existing?.documento_storage_path) {
        await supabase.storage.from("colaborador-arquivos").remove([existing.documento_storage_path]);
        documento_storage_path = null;
        documento_nome = null;
      }

      // Upload novo arquivo
      if (feriasFile) {
        // Remove antigo se houver
        if (existing?.documento_storage_path && !feriasRemoveDoc) {
          await supabase.storage.from("colaborador-arquivos").remove([existing.documento_storage_path]);
        }
        const safeName = feriasFile.name.replace(/[^\w.\-]/g, "_");
        const path = `${func.empresa_id}/${func.id}/ferias/${ferias_id}-${safeName}`;
        const { error: upErr } = await supabase.storage.from("colaborador-arquivos").upload(path, feriasFile, { upsert: true });
        if (upErr) throw upErr;
        documento_storage_path = path;
        documento_nome = feriasFile.name;
      }

      const payload = {
        data_inicio: feriasForm.data_inicio,
        data_fim: feriasForm.data_fim,
        dias,
        status: feriasForm.status,
        observacao: feriasForm.observacao || null,
        documento_storage_path,
        documento_nome,
      };

      if (editingFeriasId) {
        const { error } = await supabase.from("funcionario_ferias").update(payload).eq("id", editingFeriasId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("funcionario_ferias").insert({
          id: ferias_id,
          ...payload,
          funcionario_id: func.id,
          empresa_id: func.empresa_id,
        });
        if (error) throw error;
      }

      toast({ title: editingFeriasId ? "Férias atualizadas" : "Férias registradas" });
      setShowFeriasForm(false);
      setEditingFeriasId(null);
      setFeriasForm({ data_inicio: "", data_fim: "", status: "planejada", observacao: "" });
      setFeriasFile(null);
      setFeriasRemoveDoc(false);
      if (feriasFileInputRef.current) feriasFileInputRef.current.value = "";

      // Sincroniza com Google Agenda automaticamente se conectado
      if (googleConnected) {
        await trySyncFeriasCalendar(ferias_id, true);
      }
      await loadAll();
    } catch (err: any) {
      toast({ title: "Erro", description: err?.message, variant: "destructive" });
    } finally {
      setSavingFerias(false);
    }
  };

  const handleDownloadFeriasDoc = async (fr: FuncionarioFerias) => {
    if (!fr.documento_storage_path) return;
    const { data, error } = await supabase.storage.from("colaborador-arquivos").createSignedUrl(fr.documento_storage_path, 3600);
    if (error || !data) {
      toast({ title: "Erro", description: error?.message, variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const handleDeleteFerias = async (fid: string) => {
    const ok = await confirm({
      title: "Excluir período de férias",
      description: "Tem certeza que deseja excluir este período de férias? Esta ação não pode ser desfeita.",
      confirmLabel: "Excluir férias",
      variant: "danger",
    });
    if (!ok) return;
    const fr = ferias.find((f) => f.id === fid);
    if (fr?.documento_storage_path) {
      await supabase.storage.from("colaborador-arquivos").remove([fr.documento_storage_path]);
    }
    // Remove eventos no Google Agenda (best-effort)
    if (fr?.google_event_id || fr?.google_event_id_inicio || fr?.google_event_id_fim) {
      try {
        await supabase.functions.invoke("delete-ferias-calendar", { body: { ferias_id: fid } });
      } catch {
        // ignora — exclusão local segue mesmo se a remoção no Calendar falhar
      }
    }
    const { error } = await supabase.from("funcionario_ferias").delete().eq("id", fid);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Excluído" }); await loadAll(); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <div className="max-w-4xl mx-auto p-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!func) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <div className="max-w-4xl mx-auto p-4">
          <Button variant="ghost" onClick={() => navigate("/funcionarios")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <p className="text-center text-muted-foreground mt-8">Colaborador não encontrado.</p>
        </div>
      </div>
    );
  }

  const docsByCategoria = (cat: CategoriaDocumento) => documentos.filter((d) => d.categoria === cat);

  return (
    <div className="min-h-screen bg-background pb-44">
      <NavBar />
      <div className="max-w-4xl mx-auto p-4 space-y-4 animate-fade-in">
        {/* Header */}
        <Button variant="ghost" size="sm" onClick={() => navigate("/funcionarios")} className="gap-2 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Colaboradores
        </Button>

        <Card className="border-border/50">
          <CardContent className="py-5">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-primary/15 text-primary flex items-center justify-center text-xl font-semibold">
                {initials(func.nome_completo)}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-foreground truncate">{func.nome_completo}</h1>
                <p className="text-sm text-muted-foreground font-mono"><SensitiveText value={maskCPF(func.cpf)} masked={maskCpfSensitive(func.cpf)} /></p>
                {func.cargo && (
                  <Badge variant="secondary" className="mt-1 gap-1 text-xs">
                    <Briefcase className="h-3 w-3" /> {func.cargo}
                  </Badge>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={openEdit} className="gap-1.5 shrink-0">
                <Pencil className="h-3.5 w-3.5" /> Editar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="resumo" className="w-full">
          <TabsList className="w-full grid grid-cols-5 h-auto">
            <TabsTrigger value="resumo" className="text-xs py-2">Resumo</TabsTrigger>
            <TabsTrigger value="folhas" className="text-xs py-2">Folhas</TabsTrigger>
            <TabsTrigger value="holerites" className="text-xs py-2">Holerites</TabsTrigger>
            <TabsTrigger value="documentos" className="text-xs py-2">Documentos</TabsTrigger>
            <TabsTrigger value="ferias" className="text-xs py-2">Férias</TabsTrigger>
          </TabsList>

          {/* RESUMO */}
          <TabsContent value="resumo" className="space-y-3 mt-4">
            <Card className="border-border/50">
              <CardContent className="py-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {func.email ? (
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">E-mail</p>
                      <p className="text-sm text-foreground"><SensitiveText value={func.email} masked={maskEmailSensitive(func.email)} /></p>
                    </div>
                  </div>
                ) : (
                  <InfoRow icon={Mail} label="E-mail" value="—" />
                )}
                <InfoRow icon={Cake} label="Nascimento" value={formatDate(func.data_nascimento)} />
                <InfoRow icon={Clock} label="Entrada" value={func.horario_entrada} />
                <InfoRow icon={Clock} label="Saída" value={func.horario_saida} />
                <InfoRow icon={Clock} label="Intervalo" value={func.intervalo || "01:00"} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* FOLHAS */}
          <TabsContent value="folhas" className="space-y-3 mt-4">
            <Card className="border-border/50">
              <CardContent className="py-3 px-4 flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[140px]">
                  <Label className="text-xs">Mês de referência</Label>
                  <Input type="month" value={folhaMes} onChange={(e) => setFolhaMes(e.target.value)} />
                </div>
                <Button onClick={handleNovaFolha} disabled={creatingFolha} className="gap-1.5">
                  {creatingFolha ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Nova folha
                </Button>
              </CardContent>
            </Card>

            {folhas.length === 0 ? (
              <EmptyState icon={FileText} text="Nenhuma folha de ponto registrada." />
            ) : folhas.map((f) => (
              <Card key={f.id} className="border-border/50">
                <CardContent className="py-3 px-4 flex items-center justify-between gap-2">
                  <Link to={`/ponto/${f.id}`} className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground">{formatMes(f.mes_referencia)}</p>
                    <p className="text-xs text-muted-foreground capitalize">{f.status}</p>
                  </Link>
                  <Badge variant={f.status === "finalizada" ? "default" : "secondary"} className="text-xs">
                    {f.status}
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteFolha(f)} className="h-8 w-8 text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* HOLERITES */}
          <TabsContent value="holerites" className="space-y-3 mt-4">
            <Card className="border-border/50">
              <CardContent className="py-3 px-4 flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[140px]">
                  <Label className="text-xs">Mês de referência</Label>
                  <Input type="month" value={holeriteMes} onChange={(e) => setHoleriteMes(e.target.value)} />
                </div>
                <input
                  ref={holeriteInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadHolerite(file);
                    e.target.value = "";
                  }}
                />
                <Button
                  onClick={() => holeriteInputRef.current?.click()}
                  disabled={uploadingHolerite}
                  className="gap-1.5 btn-press relative"
                >
                  {uploadingHolerite ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="attach-bounce"><Upload className="h-4 w-4" /></span>
                  )}
                  Anexar PDF
                </Button>
              </CardContent>
            </Card>

            {holerites.length === 0 ? (
              <EmptyState icon={FileText} text="Nenhum holerite anexado." />
            ) : holerites.map((h) => (
              <Card key={h.id} className="border-border/50">
                <CardContent className="py-3 px-4 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-medium text-sm text-foreground">{formatMes(h.mes_referencia)}</p>
                    {h.enviado ? (
                      <Badge className="text-xs bg-primary/15 text-primary border-primary/30 mt-1">Enviado</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs mt-1">Pendente</Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleDownloadHolerite(h)} className="gap-1.5">
                      <Download className="h-3.5 w-3.5" /> Ver
                    </Button>
                    {func.email && !h.enviado && (
                      <Button size="sm" onClick={() => handleSendHolerite(h)} className="gap-1.5">
                        <Send className="h-3.5 w-3.5" /> Enviar
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteHolerite(h)} className="h-8 w-8 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* DOCUMENTOS */}
          <TabsContent value="documentos" className="space-y-3 mt-4">
            {CATEGORIAS.map((cat) => {
              const docs = docsByCategoria(cat.value);
              const isUp = uploadingCat === cat.value;
              return (
                <div key={cat.value} className="space-y-2">
                  <Card className="border-border/50">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{cat.label}</CardTitle>
                        <label>
                          <input
                            type="file"
                            accept=".pdf,.docx,.jpeg,.jpg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
                            className="hidden"
                            disabled={isUp}
                            multiple={cat.value === "contrato"}
                            onChange={(e) => {
                              const files = Array.from(e.target.files || []);
                              if (files.length === 0) return;
                              if (cat.value === "contrato") {
                                handleUploadContratos(files);
                              } else {
                                handleUploadDoc(cat.value, files[0]);
                              }
                              e.target.value = "";
                            }}
                          />
                          <Button variant="outline" size="sm" className="gap-1.5 pointer-events-none btn-press relative" tabIndex={-1} asChild>
                            <span>
                              {isUp ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <span className="attach-bounce"><Upload className="h-3.5 w-3.5" /></span>
                              )}
                              Anexar
                            </span>
                          </Button>
                        </label>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {docs.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">Nenhum arquivo.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {docs.map((d) => (
                            <div key={d.id} className="flex items-center justify-between bg-muted/20 rounded-lg px-3 py-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-foreground truncate">{d.nome_arquivo}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(d.created_at.split("T")[0])} {d.tamanho_bytes ? `· ${(d.tamanho_bytes / 1024).toFixed(0)} KB` : ""}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => handleDownloadDoc(d)} className="h-7 w-7"><Download className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteDoc(d)} className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {cat.value === "contrato" && func && docs.length > 0 && (
                    <AnaliseContrato funcionarioId={func.id} contratos={docs} />
                  )}
                </div>
              );
            })}
            
          </TabsContent>

          {/* FÉRIAS */}
          <TabsContent value="ferias" className="space-y-3 mt-4">
            {!showFeriasForm && (
              <Button size="sm" onClick={openNewFerias} className="gap-1.5">
                <Plus className="h-4 w-4" /> Novo período
              </Button>
            )}

            {showFeriasForm && (
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{editingFeriasId ? "Editar férias" : "Novo período de férias"}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Início</Label>
                    <Input type="date" value={feriasForm.data_inicio} onChange={(e) => setFeriasForm({ ...feriasForm, data_inicio: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Fim</Label>
                    <Input type="date" value={feriasForm.data_fim} onChange={(e) => setFeriasForm({ ...feriasForm, data_fim: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select value={feriasForm.status} onValueChange={(v) => setFeriasForm({ ...feriasForm, status: v as StatusFerias })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_FERIAS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Dias</Label>
                    <Input value={calcDias(feriasForm.data_inicio, feriasForm.data_fim) || ""} readOnly className="bg-muted/30" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Observação</Label>
                    <Textarea value={feriasForm.observacao} onChange={(e) => setFeriasForm({ ...feriasForm, observacao: e.target.value })} rows={2} />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs">Anexar documento (opcional)</Label>
                    {(() => {
                      const existing = editingFeriasId ? ferias.find((f) => f.id === editingFeriasId) : null;
                      const showExisting = existing?.documento_storage_path && !feriasFile && !feriasRemoveDoc;
                      return showExisting ? (
                        <div className="flex items-center justify-between bg-muted/20 rounded-lg px-3 py-2">
                          <p className="text-sm text-foreground truncate">{existing!.documento_nome || "Documento anexado"}</p>
                          <div className="flex gap-1">
                            <Button type="button" variant="ghost" size="sm" onClick={() => feriasFileInputRef.current?.click()}>
                              Trocar
                            </Button>
                            <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setFeriasRemoveDoc(true)}>
                              Remover
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Input
                            ref={feriasFileInputRef}
                            type="file"
                            accept=".pdf,.docx,.jpeg,.jpg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
                            onChange={(e) => {
                              const f = e.target.files?.[0] || null;
                              setFeriasFile(f);
                              if (f) setFeriasRemoveDoc(false);
                            }}
                            className="text-xs"
                          />
                          {feriasFile && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => { setFeriasFile(null); if (feriasFileInputRef.current) feriasFileInputRef.current.value = ""; }}>
                              Limpar
                            </Button>
                          )}
                        </div>
                      );
                    })()}
                    <p className="text-[11px] text-muted-foreground mt-1">PDF, DOCX, JPG ou PNG · máx 10MB</p>
                  </div>
                  {googleConnected && (
                    <p className="sm:col-span-2 text-[11px] text-muted-foreground">
                      📅 O evento será criado automaticamente no seu Google Agenda ao salvar.
                    </p>
                  )}
                  <div className="sm:col-span-2 flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setShowFeriasForm(false); setEditingFeriasId(null); setFeriasFile(null); setFeriasRemoveDoc(false); }} disabled={savingFerias}>Cancelar</Button>
                    <Button size="sm" onClick={handleSaveFerias} disabled={savingFerias} className="gap-1.5">
                      {savingFerias && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Salvar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {ferias.length === 0 && !showFeriasForm ? (
              <EmptyState icon={Calendar} text="Nenhum período de férias registrado." />
            ) : ferias.map((fr) => {
              const st = STATUS_FERIAS.find((s) => s.value === fr.status);
              return (
                <Card key={fr.id} className="border-border/50">
                  <CardContent className="py-3 px-4 flex items-center justify-between flex-wrap gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground">
                        {formatDate(fr.data_inicio)} → {formatDate(fr.data_fim)}
                      </p>
                      <p className="text-xs text-muted-foreground">{fr.dias} dia(s)</p>
                      {fr.observacao && <p className="text-xs text-muted-foreground mt-1">{fr.observacao}</p>}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {fr.documento_storage_path && (
                          <Button variant="outline" size="sm" className="h-6 text-[11px] gap-1" onClick={() => handleDownloadFeriasDoc(fr)}>
                            <Download className="h-3 w-3" /> {fr.documento_nome || "Documento"}
                          </Button>
                        )}
                        {fr.google_event_id && (
                          <Badge variant="outline" className="text-[10px] bg-primary/5 border-primary/30 text-primary">
                            📅 Na Agenda
                          </Badge>
                        )}
                        {!fr.google_event_id && googleConnected && (
                          <Button
                            variant="outline" size="sm" className="h-6 text-[11px] gap-1"
                            disabled={syncingFeriasId === fr.id}
                            onClick={async () => {
                              setSyncingFeriasId(fr.id);
                              await trySyncFeriasCalendar(fr.id, false);
                              setSyncingFeriasId(null);
                              await loadAll();
                            }}
                          >
                            {syncingFeriasId === fr.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Calendar className="h-3 w-3" />}
                            Sincronizar Agenda
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {st && <Badge className={`text-xs ${st.color}`} variant="outline">{st.label}</Badge>}
                      <Button variant="ghost" size="icon" onClick={() => openEditFerias(fr)} className="h-7 w-7">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteFerias(fr.id)} className="h-7 w-7 text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Funcionário Dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => !savingEdit && setEditOpen(o)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar informações do colaborador</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <Label htmlFor="ed-nome" className="text-xs">Nome completo *</Label>
              <Input
                id="ed-nome"
                value={editForm.nome_completo}
                onChange={(e) => setEditForm({ ...editForm, nome_completo: e.target.value })}
                onBlur={() => setEditTouched((t) => ({ ...t, nome_completo: true }))}
                aria-invalid={editTouched.nome_completo && !!editErrors.nome_completo}
                className={cn(editTouched.nome_completo && editErrors.nome_completo && "border-destructive focus-visible:ring-destructive/40")}
              />
              {editTouched.nome_completo && editErrors.nome_completo && <p className="text-xs text-destructive mt-1">{editErrors.nome_completo}</p>}
            </div>
            <div>
              <Label htmlFor="ed-cpf" className="text-xs">CPF *</Label>
              <Input
                id="ed-cpf"
                value={maskCPF(editForm.cpf)}
                onChange={(e) => setEditForm({ ...editForm, cpf: e.target.value.replace(/\D/g, "").slice(0, 11) })}
                onBlur={() => setEditTouched((t) => ({ ...t, cpf: true }))}
                placeholder="000.000.000-00"
                inputMode="numeric"
                aria-invalid={editTouched.cpf && !!editErrors.cpf}
                className={cn(editTouched.cpf && editErrors.cpf && "border-destructive focus-visible:ring-destructive/40")}
              />
              {editTouched.cpf && editErrors.cpf && <p className="text-xs text-destructive mt-1">{editErrors.cpf}</p>}
            </div>
            <div>
              <Label htmlFor="ed-email" className="text-xs">E-mail</Label>
              <Input
                id="ed-email"
                type="email"
                placeholder="joao@empresa.com.br"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                onBlur={() => setEditTouched((t) => ({ ...t, email: true }))}
                aria-invalid={editTouched.email && !!editErrors.email}
                className={cn(editTouched.email && editErrors.email && "border-destructive focus-visible:ring-destructive/40")}
              />
              {editTouched.email && editErrors.email && <p className="text-xs text-destructive mt-1">{editErrors.email}</p>}
            </div>
            <div>
              <Label htmlFor="ed-cargo" className="text-xs">Cargo</Label>
              <Input id="ed-cargo" value={editForm.cargo} onChange={(e) => setEditForm({ ...editForm, cargo: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="ed-nasc" className="text-xs">Nascimento</Label>
              <Input id="ed-nasc" type="date" max={new Date().toISOString().split("T")[0]} value={editForm.data_nascimento} onChange={(e) => setEditForm({ ...editForm, data_nascimento: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="ed-ent" className="text-xs">Entrada</Label>
              <Input id="ed-ent" type="time" value={editForm.horario_entrada} onChange={(e) => setEditForm({ ...editForm, horario_entrada: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="ed-sai" className="text-xs">Saída</Label>
              <Input id="ed-sai" type="time" value={editForm.horario_saida} onChange={(e) => setEditForm({ ...editForm, horario_saida: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="ed-int" className="text-xs">Intervalo (HH:MM)</Label>
              <Input id="ed-int" value={editForm.intervalo} onChange={(e) => setEditForm({ ...editForm, intervalo: e.target.value })} placeholder="01:00" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={savingEdit} className="min-h-[44px] sm:min-h-0">Cancelar</Button>
            <SpinnerButton onClick={handleSaveEdit} loading={savingEdit} loadingText="Salvando…" className="min-h-[44px] sm:min-h-0">
              Salvar
            </SpinnerButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="text-center py-8">
      <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground text-sm">{text}</p>
    </div>
  );
}
