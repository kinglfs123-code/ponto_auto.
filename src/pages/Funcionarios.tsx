import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ResponsiveNav } from "@/components/nav/ResponsiveNav";
import AppHeader from "@/components/AppHeader";
import EmpresaSelector from "@/components/EmpresaSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SpinnerButton } from "@/components/ui/spinner-button";
import { useConfirm } from "@/hooks/use-confirm";
import { friendlyError } from "@/lib/error-messages";
import { maskCPF, maskCpfSensitive, validateCPF, validateEmail, maskHM } from "@/lib/ponto-rules";
import { SensitiveText } from "@/components/SensitiveText";
import { Pencil, Trash2, Plus, X, Users, Clock } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { cn } from "@/lib/utils";
import type { Funcionario } from "@/types";

const empty: Omit<Funcionario, "id" | "empresa_id"> = {
  nome_completo: "",
  cpf: "",
  email: "",
  data_nascimento: "",
  cargo: "",
  horario_entrada: "08:00",
  horario_saida: "17:00",
  intervalo: "01:00",
};

const validHM = (v: string) => /^\d{2}:\d{2}$/.test(v) && parseInt(v.slice(0, 2)) <= 23 && parseInt(v.slice(3, 5)) <= 59;

type FormErrors = {
  nome_completo?: string;
  cpf?: string;
  email?: string;
  data_nascimento?: string;
  horario_entrada?: string;
  horario_saida?: string;
  intervalo?: string;
};

function validateFuncionario(f: typeof empty): FormErrors {
  const e: FormErrors = {};
  if (!f.nome_completo.trim()) e.nome_completo = "Informe o nome completo.";
  else if (f.nome_completo.trim().length < 2) e.nome_completo = "O nome deve ter ao menos 2 caracteres.";
  if (!f.cpf.trim()) e.cpf = "CPF é obrigatório.";
  else if (!validateCPF(f.cpf)) e.cpf = "CPF inválido. Verifique os dígitos.";
  if (f.email && !validateEmail(f.email)) e.email = "E-mail inválido. Use o formato usuario@dominio.com.";
  if (f.data_nascimento) {
    const d = new Date(f.data_nascimento);
    if (isNaN(d.getTime())) e.data_nascimento = "Data inválida.";
    else if (d > new Date()) e.data_nascimento = "Data não pode ser no futuro.";
  }
  if (!validHM(f.horario_entrada)) e.horario_entrada = "Use HH:MM.";
  if (!validHM(f.horario_saida)) e.horario_saida = "Use HH:MM.";
  if (f.intervalo && !validHM(f.intervalo)) e.intervalo = "Use HH:MM.";
  return e;
}

export default function Funcionarios() {
  const { empresa, setEmpresa } = useEmpresa();
  const confirm = useConfirm();
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const errors = useMemo(() => validateFuncionario(form), [form]);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const sortAlfabetico = (arr: Funcionario[]) =>
    [...arr].sort((a, b) =>
      a.nome_completo.localeCompare(b.nome_completo, "pt-BR", { sensitivity: "base" })
    );

  useEffect(() => {
    if (!empresa) { setFuncionarios([]); return; }
    setListLoading(true);
    supabase
      .from("funcionarios")
      .select("id, empresa_id, nome_completo, cpf, email, data_nascimento, cargo, horario_entrada, horario_saida, intervalo")
      .eq("empresa_id", empresa.id)
      .order("nome_completo")
      .then(({ data, error }) => {
        if (error) toast({ title: "Erro ao carregar", description: friendlyError(error), variant: "destructive" });
        else setFuncionarios(sortAlfabetico((data as Funcionario[]) || []));
        setListLoading(false);
      });
  }, [empresa]);

  const resetForm = () => { setForm(empty); setEditId(null); setShowForm(false); setTouched({}); };

  const markBlur = (field: keyof FormErrors) => setTouched((t) => ({ ...t, [field]: true }));

  const handleSave = async () => {
    if (!empresa) return;
    setTouched({ nome_completo: true, cpf: true, email: true, data_nascimento: true, horario_entrada: true, horario_saida: true, intervalo: true });
    if (Object.keys(errors).length > 0) {
      toast({ title: "Verifique os campos", description: "Alguns dados estão incorretos.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const payload = {
      empresa_id: empresa.id,
      nome_completo: form.nome_completo.trim(),
      cpf: form.cpf.replace(/\D/g, ""),
      email: form.email?.trim() || null,
      data_nascimento: form.data_nascimento || null,
      cargo: form.cargo?.trim() || null,
      horario_entrada: form.horario_entrada || "08:00",
      horario_saida: form.horario_saida || "17:00",
      intervalo: form.intervalo || "01:00",
    };

    try {
      const { error } = editId
        ? await supabase.from("funcionarios").update(payload).eq("id", editId)
        : await supabase.from("funcionarios").insert(payload);
      if (error) throw error;
      toast({ title: editId ? "Colaborador atualizado" : "Colaborador cadastrado" });
      resetForm();
      const { data } = await supabase.from("funcionarios").select("id, empresa_id, nome_completo, cpf, email, data_nascimento, cargo, horario_entrada, horario_saida, intervalo").eq("empresa_id", empresa.id).order("nome_completo");
      setFuncionarios(sortAlfabetico((data as Funcionario[]) || []));
    } catch (err) {
      toast({ title: "Erro ao salvar", description: friendlyError(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (f: Funcionario) => {
    setForm({
      nome_completo: f.nome_completo,
      cpf: maskCPF(f.cpf),
      email: f.email || "",
      data_nascimento: f.data_nascimento || "",
      cargo: f.cargo || "",
      horario_entrada: f.horario_entrada,
      horario_saida: f.horario_saida,
      intervalo: f.intervalo || "01:00",
    });
    setEditId(f.id);
    setTouched({});
    setShowForm(true);
  };

  const handleDelete = async (f: Funcionario) => {
    if (!empresa) return;
    const ok = await confirm({
      title: "Excluir colaborador",
      description: `Tem certeza que deseja excluir ${f.nome_completo}? Esta ação não pode ser desfeita.`,
      confirmLabel: "Excluir colaborador",
      variant: "danger",
    });
    if (!ok) return;
    setDeletingId(f.id);
    try {
      const { error } = await supabase.from("funcionarios").delete().eq("id", f.id);
      if (error) throw error;
      setFuncionarios((prev) => prev.filter((x) => x.id !== f.id));
      toast({ title: "Colaborador excluído" });
    } catch (err) {
      toast({ title: "Erro ao excluir", description: friendlyError(err), variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const fieldError = (field: keyof FormErrors) => touched[field] && errors[field];

  return (
    <div className="min-h-screen bg-background pb-44">
      <ResponsiveNav />
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <AppHeader module="rh" backFallback="/" />
        <h1 className="text-2xl font-bold text-foreground tracking-tight animate-fade-in">Colaboradores</h1>
        <div className="flex flex-wrap items-end gap-3 animate-fade-in">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs text-muted-foreground">Empresa</Label>
            <EmpresaSelector value={empresa?.id || null} onChange={setEmpresa} />
          </div>
          {empresa && (
            <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }} className="gap-1.5 min-h-[44px] sm:min-h-0">
              <Plus className="h-4 w-4" /> Novo colaborador
            </Button>
          )}
        </div>

        {showForm && empresa && (
          <Card className="animate-fade-in border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{editId ? "Editar colaborador" : "Novo colaborador"}</CardTitle>
                <Button variant="ghost" size="icon" onClick={resetForm} className="h-8 w-8" aria-label="Fechar formulário"><X className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="func-nome" className="text-xs">Nome completo *</Label>
                <Input
                  id="func-nome"
                  placeholder="João da Silva"
                  value={form.nome_completo}
                  onChange={(e) => setForm({ ...form, nome_completo: e.target.value })}
                  onBlur={() => markBlur("nome_completo")}
                  aria-invalid={!!fieldError("nome_completo")}
                  className={cn("bg-muted/30 border-border/50", fieldError("nome_completo") && "border-destructive focus-visible:ring-destructive/40")}
                />
                {fieldError("nome_completo") && <p className="text-xs text-destructive mt-1">{errors.nome_completo}</p>}
              </div>
              <div>
                <Label htmlFor="func-cpf" className="text-xs">CPF *</Label>
                <Input
                  id="func-cpf"
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: maskCPF(e.target.value) })}
                  onBlur={() => markBlur("cpf")}
                  placeholder="000.000.000-00"
                  inputMode="numeric"
                  aria-invalid={!!fieldError("cpf")}
                  className={cn("bg-muted/30 border-border/50", fieldError("cpf") && "border-destructive focus-visible:ring-destructive/40")}
                />
                {fieldError("cpf") && <p className="text-xs text-destructive mt-1">{errors.cpf}</p>}
              </div>
              <div>
                <Label htmlFor="func-email" className="text-xs">E-mail</Label>
                <Input
                  id="func-email"
                  type="email"
                  placeholder="joao@empresa.com.br"
                  value={form.email || ""}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  onBlur={() => markBlur("email")}
                  aria-invalid={!!fieldError("email")}
                  className={cn("bg-muted/30 border-border/50", fieldError("email") && "border-destructive focus-visible:ring-destructive/40")}
                />
                {fieldError("email") && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
              </div>
              <div>
                <Label htmlFor="func-nasc" className="text-xs">Data de Nascimento</Label>
                <Input
                  id="func-nasc"
                  type="date"
                  value={form.data_nascimento || ""}
                  onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })}
                  onBlur={() => markBlur("data_nascimento")}
                  max={new Date().toISOString().split("T")[0]}
                  aria-invalid={!!fieldError("data_nascimento")}
                  className={cn("bg-muted/30 border-border/50", fieldError("data_nascimento") && "border-destructive focus-visible:ring-destructive/40")}
                />
                {fieldError("data_nascimento") && <p className="text-xs text-destructive mt-1">{errors.data_nascimento}</p>}
              </div>
              <div>
                <Label htmlFor="func-cargo" className="text-xs">Cargo</Label>
                <Input id="func-cargo" placeholder="Analista" value={form.cargo || ""} onChange={(e) => setForm({ ...form, cargo: e.target.value })} className="bg-muted/30 border-border/50" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="func-entrada" className="text-xs">Entrada</Label>
                  <Input id="func-entrada" value={form.horario_entrada} onChange={(e) => setForm({ ...form, horario_entrada: maskHM(e.target.value) })} onBlur={() => markBlur("horario_entrada")} placeholder="08:00" inputMode="numeric" aria-invalid={!!fieldError("horario_entrada")} className={cn("bg-muted/30 border-border/50", fieldError("horario_entrada") && "border-destructive")} />
                </div>
                <div className="flex-1">
                  <Label htmlFor="func-saida" className="text-xs">Saída</Label>
                  <Input id="func-saida" value={form.horario_saida} onChange={(e) => setForm({ ...form, horario_saida: maskHM(e.target.value) })} onBlur={() => markBlur("horario_saida")} placeholder="17:00" inputMode="numeric" aria-invalid={!!fieldError("horario_saida")} className={cn("bg-muted/30 border-border/50", fieldError("horario_saida") && "border-destructive")} />
                </div>
                <div className="flex-1">
                  <Label htmlFor="func-int" className="text-xs">Intervalo</Label>
                  <Input id="func-int" value={form.intervalo} onChange={(e) => setForm({ ...form, intervalo: maskHM(e.target.value) })} onBlur={() => markBlur("intervalo")} placeholder="01:00" inputMode="numeric" aria-invalid={!!fieldError("intervalo")} className={cn("bg-muted/30 border-border/50", fieldError("intervalo") && "border-destructive")} />
                </div>
              </div>
              {(fieldError("horario_entrada") || fieldError("horario_saida") || fieldError("intervalo")) && (
                <p className="text-xs text-destructive sm:col-span-2 -mt-1">Use o formato HH:MM nos horários.</p>
              )}
              <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={resetForm} size="sm" className="min-h-[44px] sm:min-h-0">Cancelar</Button>
                <SpinnerButton onClick={handleSave} loading={loading} loadingText="Salvando…" size="sm" className="min-h-[44px] sm:min-h-0">
                  Salvar
                </SpinnerButton>
              </div>
            </CardContent>
          </Card>
        )}

        {empresa && listLoading && (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        )}

        {empresa && !listLoading && funcionarios.length === 0 && !showForm && (
          <div className="text-center py-8 animate-fade-in">
            <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">Nenhum colaborador cadastrado.</p>
          </div>
        )}

        {!listLoading && funcionarios.length > 0 && !isMobile && (
          <div className="border border-border/50 rounded-lg overflow-x-auto animate-fade-in">
            <table className="w-full text-sm min-w-[480px]">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-left p-2.5 font-medium text-muted-foreground text-xs">Nome</th>
                  <th className="text-left p-2.5 font-medium text-muted-foreground text-xs">CPF</th>
                  <th className="text-left p-2.5 font-medium text-muted-foreground text-xs hidden sm:table-cell">Cargo</th>
                  <th className="text-left p-2.5 font-medium text-muted-foreground text-xs hidden md:table-cell">Horário</th>
                  <th className="p-2.5 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {funcionarios.map((f) => (
                  <tr
                    key={f.id}
                    onClick={() => navigate(`/funcionarios/${f.id}`)}
                    className="border-t border-border/30 hover:bg-muted/20 transition-colors cursor-pointer"
                  >
                    <td className="p-2.5 text-foreground text-sm">{f.nome_completo}</td>
                    <td className="p-2.5 text-muted-foreground text-sm font-mono"><SensitiveText value={maskCPF(f.cpf)} masked={maskCpfSensitive(f.cpf)} /></td>
                    <td className="p-2.5 text-muted-foreground text-sm hidden sm:table-cell">{f.cargo || "—"}</td>
                    <td className="p-2.5 text-muted-foreground text-sm hidden md:table-cell">{f.horario_entrada} – {f.horario_saida} <span className="text-xs opacity-60">(int: {f.intervalo || "01:00"})</span></td>
                    <td className="p-2.5 flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(f)} className="h-8 w-8" aria-label={`Editar ${f.nome_completo}`}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(f)} disabled={deletingId === f.id} className="h-8 w-8 text-destructive hover:text-destructive" aria-label={`Excluir ${f.nome_completo}`}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile cards */}
        {!listLoading && funcionarios.length > 0 && isMobile && (
          <div className="space-y-2 animate-fade-in">
            {funcionarios.map((f) => (
              <Card
                key={f.id}
                onClick={() => navigate(`/funcionarios/${f.id}`)}
                className="border-border/50 cursor-pointer hover:bg-muted/20 transition-colors"
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{f.nome_completo}</p>
                      <p className="text-xs text-muted-foreground font-mono"><SensitiveText value={maskCPF(f.cpf)} masked={maskCpfSensitive(f.cpf)} /></p>
                      {f.cargo && <p className="text-xs text-muted-foreground">{f.cargo}</p>}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {f.horario_entrada} – {f.horario_saida} <span className="opacity-60">(int: {f.intervalo || "01:00"})</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(f)} className="h-11 w-11" aria-label={`Editar ${f.nome_completo}`}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(f)} disabled={deletingId === f.id} className="h-11 w-11 text-destructive" aria-label={`Excluir ${f.nome_completo}`}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
