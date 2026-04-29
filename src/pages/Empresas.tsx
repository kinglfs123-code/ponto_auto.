import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SpinnerButton } from "@/components/ui/spinner-button";
import { toast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import { friendlyError } from "@/lib/error-messages";
import { maskCNPJ, validateCNPJ, maskHM } from "@/lib/ponto-rules";
import { Trash2, Building2, Pencil } from "lucide-react";
import NavBar from "@/components/NavBar";
import BackButton from "@/components/ui/back-button";
import { cn } from "@/lib/utils";
import type { Empresa } from "@/types";

type Errors = { nome?: string; cnpj?: string; jornada?: string };
type Touched = { nome?: boolean; cnpj?: boolean; jornada?: boolean };

const validHM = (v: string) => /^\d{2}:\d{2}$/.test(v) && parseInt(v.slice(0, 2)) <= 23 && parseInt(v.slice(3, 5)) <= 59;

function validateForm(values: { nome: string; cnpj: string; jornada: string }): Errors {
  const e: Errors = {};
  if (!values.nome.trim()) e.nome = "Informe o nome da empresa.";
  else if (values.nome.trim().length < 2) e.nome = "O nome deve ter ao menos 2 caracteres.";
  if (!values.cnpj.trim()) e.cnpj = "CNPJ é obrigatório.";
  else if (!validateCNPJ(values.cnpj)) e.cnpj = "CNPJ inválido. Confira os 14 dígitos.";
  if (!values.jornada.trim()) e.jornada = "Informe a jornada.";
  else if (!validHM(values.jornada)) e.jornada = "Use o formato HH:MM (ex: 07:20).";
  return e;
}

export default function Empresas() {
  const confirm = useConfirm();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [jornada, setJornada] = useState("07:20");
  const [loading, setLoading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [touched, setTouched] = useState<Touched>({});
  const errors = validateForm({ nome, cnpj, jornada });
  const hasErrors = Object.keys(errors).length > 0;

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editEmpresa, setEditEmpresa] = useState<Empresa | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editCnpj, setEditCnpj] = useState("");
  const [editJornada, setEditJornada] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editTouched, setEditTouched] = useState<Touched>({});
  const editErrors = validateForm({ nome: editNome, cnpj: editCnpj, jornada: editJornada });
  const editHasErrors = Object.keys(editErrors).length > 0;

  const load = async () => {
    setListLoading(true);
    const { data, error } = await supabase.from("empresas").select("id, cnpj, nome, jornada_padrao, owner_id, created_at").order("created_at");
    if (error) toast({ title: "Erro ao carregar", description: friendlyError(error), variant: "destructive" });
    if (data) setEmpresas(data);
    setListLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ nome: true, cnpj: true, jornada: true });
    if (hasErrors) {
      toast({ title: "Verifique os campos", description: "Alguns dados estão incorretos.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast({ title: "Sessão expirou", description: "Faça login novamente.", variant: "destructive" }); return; }
      const { error } = await supabase.from("empresas").insert({
        owner_id: user.id,
        cnpj: cnpj.replace(/\D/g, ""),
        nome: nome.trim(),
        jornada_padrao: jornada || "07:20",
      });
      if (error) throw error;
      setNome(""); setCnpj(""); setJornada("07:20"); setTouched({});
      toast({ title: "Empresa adicionada" });
      load();
    } catch (err) {
      toast({ title: "Erro ao adicionar", description: friendlyError(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const remove = async (emp: Empresa) => {
    const ok = await confirm({
      title: "Excluir empresa",
      description: `Tem certeza que deseja excluir "${emp.nome}"? Todos os colaboradores, folhas, holerites e documentos vinculados também serão removidos. Esta ação não pode ser desfeita.`,
      confirmLabel: "Excluir empresa",
      variant: "danger",
    });
    if (!ok) return;
    setRemovingId(emp.id);
    try {
      const { error } = await supabase.from("empresas").delete().eq("id", emp.id);
      if (error) throw error;
      toast({ title: "Empresa removida" });
      setEmpresas((prev) => prev.filter((e) => e.id !== emp.id));
    } catch (err) {
      toast({ title: "Erro ao remover", description: friendlyError(err), variant: "destructive" });
    } finally {
      setRemovingId(null);
    }
  };

  const openEdit = (emp: Empresa) => {
    setEditEmpresa(emp);
    setEditNome(emp.nome);
    setEditCnpj(maskCNPJ(emp.cnpj));
    setEditJornada(emp.jornada_padrao);
    setEditTouched({});
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editEmpresa) return;
    setEditTouched({ nome: true, cnpj: true, jornada: true });
    if (editHasErrors) {
      toast({ title: "Verifique os campos", description: "Alguns dados estão incorretos.", variant: "destructive" });
      return;
    }
    setEditLoading(true);
    try {
      const { error } = await supabase.from("empresas").update({
        nome: editNome.trim(),
        cnpj: editCnpj.replace(/\D/g, ""),
        jornada_padrao: editJornada || "07:20",
      }).eq("id", editEmpresa.id);
      if (error) throw error;
      toast({ title: "Empresa atualizada" });
      setEditOpen(false);
      load();
    } catch (err) {
      toast({ title: "Erro ao salvar", description: friendlyError(err), variant: "destructive" });
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-44">
      <NavBar />
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <BackButton fallback="/" />
        <h1 className="text-2xl font-bold text-foreground tracking-tight animate-fade-in">Empresas</h1>

        <Card className="animate-fade-in">
          <CardContent className="pt-4">
            <form onSubmit={add} className="space-y-3" noValidate>
              <div>
                <Label htmlFor="emp-nome" className="text-xs">Nome da empresa *</Label>
                <Input
                  id="emp-nome"
                  placeholder="Acme Ltda."
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, nome: true }))}
                  aria-invalid={touched.nome && !!errors.nome}
                  className={cn(touched.nome && errors.nome && "border-destructive focus-visible:ring-destructive/40")}
                />
                {touched.nome && errors.nome && <p className="text-xs text-destructive mt-1">{errors.nome}</p>}
              </div>
              <div>
                <Label htmlFor="emp-cnpj" className="text-xs">CNPJ *</Label>
                <Input
                  id="emp-cnpj"
                  placeholder="00.000.000/0000-00"
                  value={cnpj}
                  onChange={(e) => setCnpj(maskCNPJ(e.target.value))}
                  onBlur={() => setTouched((t) => ({ ...t, cnpj: true }))}
                  maxLength={18}
                  inputMode="numeric"
                  aria-invalid={touched.cnpj && !!errors.cnpj}
                  className={cn(touched.cnpj && errors.cnpj && "border-destructive focus-visible:ring-destructive/40")}
                />
                {touched.cnpj && errors.cnpj && <p className="text-xs text-destructive mt-1">{errors.cnpj}</p>}
              </div>
              <div>
                <Label htmlFor="emp-jornada" className="text-xs">Jornada padrão (HH:MM) *</Label>
                <Input
                  id="emp-jornada"
                  value={jornada}
                  onChange={(e) => setJornada(maskHM(e.target.value))}
                  onBlur={() => setTouched((t) => ({ ...t, jornada: true }))}
                  className={cn("w-24", touched.jornada && errors.jornada && "border-destructive focus-visible:ring-destructive/40")}
                  maxLength={5}
                  placeholder="07:20"
                  inputMode="numeric"
                  aria-invalid={touched.jornada && !!errors.jornada}
                />
                {touched.jornada && errors.jornada && <p className="text-xs text-destructive mt-1">{errors.jornada}</p>}
              </div>
              <SpinnerButton type="submit" loading={loading} loadingText="Adicionando…" disabled={hasErrors && Object.keys(touched).length > 0} className="w-full">
                Adicionar empresa
              </SpinnerButton>
            </form>
          </CardContent>
        </Card>

        {listLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : empresas.length === 0 ? (
          <div className="text-center py-8 animate-fade-in">
            <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">Nenhuma empresa cadastrada.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {empresas.map((emp, i) => (
              <Card
                key={emp.id}
                className="animate-fade-in hover:shadow-md transition-all cursor-pointer"
                style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}
                onClick={() => openEdit(emp)}
              >
                <CardContent className="flex items-center justify-between py-3 px-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{emp.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        CNPJ: {maskCNPJ(emp.cnpj)} · Jornada: {emp.jornada_padrao}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEdit(emp); }} className="h-11 w-11 sm:h-8 sm:w-8 text-muted-foreground hover:text-primary" aria-label={`Editar ${emp.nome}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); remove(emp); }}
                      disabled={removingId === emp.id}
                      className="h-11 w-11 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive"
                      aria-label={`Excluir ${emp.nome}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => !editLoading && setEditOpen(o)}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar empresa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label htmlFor="edit-emp-nome" className="text-xs">Nome da empresa *</Label>
              <Input
                id="edit-emp-nome"
                placeholder="Acme Ltda."
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
                onBlur={() => setEditTouched((t) => ({ ...t, nome: true }))}
                aria-invalid={editTouched.nome && !!editErrors.nome}
                className={cn(editTouched.nome && editErrors.nome && "border-destructive focus-visible:ring-destructive/40")}
              />
              {editTouched.nome && editErrors.nome && <p className="text-xs text-destructive mt-1">{editErrors.nome}</p>}
            </div>
            <div>
              <Label htmlFor="edit-emp-cnpj" className="text-xs">CNPJ *</Label>
              <Input
                id="edit-emp-cnpj"
                placeholder="00.000.000/0000-00"
                value={editCnpj}
                onChange={(e) => setEditCnpj(maskCNPJ(e.target.value))}
                onBlur={() => setEditTouched((t) => ({ ...t, cnpj: true }))}
                maxLength={18}
                inputMode="numeric"
                aria-invalid={editTouched.cnpj && !!editErrors.cnpj}
                className={cn(editTouched.cnpj && editErrors.cnpj && "border-destructive focus-visible:ring-destructive/40")}
              />
              {editTouched.cnpj && editErrors.cnpj && <p className="text-xs text-destructive mt-1">{editErrors.cnpj}</p>}
            </div>
            <div>
              <Label htmlFor="edit-emp-jornada" className="text-xs">Jornada padrão (HH:MM) *</Label>
              <Input
                id="edit-emp-jornada"
                value={editJornada}
                onChange={(e) => setEditJornada(maskHM(e.target.value))}
                onBlur={() => setEditTouched((t) => ({ ...t, jornada: true }))}
                className={cn("w-24", editTouched.jornada && editErrors.jornada && "border-destructive focus-visible:ring-destructive/40")}
                maxLength={5}
                placeholder="07:20"
                inputMode="numeric"
                aria-invalid={editTouched.jornada && !!editErrors.jornada}
              />
              {editTouched.jornada && editErrors.jornada && <p className="text-xs text-destructive mt-1">{editErrors.jornada}</p>}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editLoading} className="min-h-[44px] sm:min-h-0">Cancelar</Button>
            <SpinnerButton onClick={saveEdit} loading={editLoading} loadingText="Salvando…" className="min-h-[44px] sm:min-h-0">
              Salvar
            </SpinnerButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
