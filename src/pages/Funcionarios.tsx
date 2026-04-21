import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import NavBar from "@/components/NavBar";
import EmpresaSelector from "@/components/EmpresaSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { maskCPF, validateCPF, maskHM } from "@/lib/ponto-rules";
import { Pencil, Trash2, Plus, X, Users, Clock } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEmpresa } from "@/contexts/EmpresaContext";
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

export default function Funcionarios() {
  const { empresa, setEmpresa } = useEmpresa();
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const sortAlfabetico = (arr: Funcionario[]) =>
    [...arr].sort((a, b) =>
      a.nome_completo.localeCompare(b.nome_completo, "pt-BR", { sensitivity: "base" })
    );

  useEffect(() => {
    if (!empresa) { setFuncionarios([]); return; }
    supabase
      .from("funcionarios")
      .select("*")
      .eq("empresa_id", empresa.id)
      .order("nome_completo")
      .then(({ data, error }) => {
        if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
        else setFuncionarios(sortAlfabetico((data as Funcionario[]) || []));
      });
  }, [empresa]);

  const resetForm = () => { setForm(empty); setEditId(null); setShowForm(false); };

  const handleSave = async () => {
    if (!empresa) return;
    if (!form.nome_completo.trim()) { toast({ title: "Nome é obrigatório", variant: "destructive" }); return; }
    if (!validateCPF(form.cpf)) { toast({ title: "CPF inválido (11 dígitos)", variant: "destructive" }); return; }

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

    let error;
    if (editId) {
      ({ error } = await supabase.from("funcionarios").update(payload).eq("id", editId));
    } else {
      ({ error } = await supabase.from("funcionarios").insert(payload));
    }

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editId ? "Atualizado!" : "Cadastrado!" });
      resetForm();
      const { data } = await supabase.from("funcionarios").select("*").eq("empresa_id", empresa.id).order("nome_completo");
      setFuncionarios(sortAlfabetico((data as Funcionario[]) || []));
    }
    setLoading(false);
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
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!empresa) return;
    const { error } = await supabase.from("funcionarios").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      setFuncionarios((prev) => prev.filter((f) => f.id !== id));
      toast({ title: "Excluído!" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <NavBar />
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-3 animate-fade-in">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs text-muted-foreground">Empresa</Label>
            <EmpresaSelector value={empresa?.id || null} onChange={setEmpresa} />
          </div>
          {empresa && (
            <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }} className="gap-1.5">
              <Plus className="h-4 w-4" /> Novo
            </Button>
          )}
        </div>

        {showForm && empresa && (
          <Card className="animate-fade-in border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{editId ? "Editar" : "Novo"} Funcionário</CardTitle>
                <Button variant="ghost" size="icon" onClick={resetForm} className="h-8 w-8"><X className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nome completo *</Label>
                <Input value={form.nome_completo} onChange={(e) => setForm({ ...form, nome_completo: e.target.value })} className="bg-muted/30 border-border/50" />
              </div>
              <div>
                <Label className="text-xs">CPF *</Label>
                <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: maskCPF(e.target.value) })} placeholder="000.000.000-00" className="bg-muted/30 border-border/50" />
              </div>
              <div>
                <Label className="text-xs">E-mail</Label>
                <Input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-muted/30 border-border/50" />
              </div>
              <div>
                <Label className="text-xs">Data de Nascimento</Label>
                <Input type="date" value={form.data_nascimento || ""} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} className="bg-muted/30 border-border/50" />
              </div>
              <div>
                <Label className="text-xs">Cargo</Label>
                <Input value={form.cargo || ""} onChange={(e) => setForm({ ...form, cargo: e.target.value })} className="bg-muted/30 border-border/50" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Entrada</Label>
                  <Input value={form.horario_entrada} onChange={(e) => setForm({ ...form, horario_entrada: maskHM(e.target.value) })} placeholder="08:00" className="bg-muted/30 border-border/50" />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Saída</Label>
                  <Input value={form.horario_saida} onChange={(e) => setForm({ ...form, horario_saida: maskHM(e.target.value) })} placeholder="17:00" className="bg-muted/30 border-border/50" />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Intervalo</Label>
                  <Input value={form.intervalo} onChange={(e) => setForm({ ...form, intervalo: maskHM(e.target.value) })} placeholder="01:00" className="bg-muted/30 border-border/50" />
                </div>
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={resetForm} size="sm">Cancelar</Button>
                <Button onClick={handleSave} disabled={loading} size="sm">{loading ? "Salvando…" : "Salvar"}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {empresa && funcionarios.length === 0 && !showForm && (
          <div className="text-center py-8 animate-fade-in">
            <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">Nenhum funcionário cadastrado.</p>
          </div>
        )}

        {funcionarios.length > 0 && !isMobile && (
          <div className="border border-border/50 rounded-lg overflow-hidden animate-fade-in">
            <table className="w-full text-sm">
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
                  <tr key={f.id} className="border-t border-border/30 hover:bg-muted/20 transition-colors">
                    <td className="p-2.5 text-foreground text-sm">{f.nome_completo}</td>
                    <td className="p-2.5 text-muted-foreground text-sm font-mono">{maskCPF(f.cpf)}</td>
                    <td className="p-2.5 text-muted-foreground text-sm hidden sm:table-cell">{f.cargo || "—"}</td>
                    <td className="p-2.5 text-muted-foreground text-sm hidden md:table-cell">{f.horario_entrada} – {f.horario_saida} <span className="text-xs opacity-60">(int: {f.intervalo || "01:00"})</span></td>
                    <td className="p-2.5 flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(f)} className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(f.id)} className="h-7 w-7 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile cards */}
        {funcionarios.length > 0 && isMobile && (
          <div className="space-y-2 animate-fade-in">
            {funcionarios.map((f) => (
              <Card key={f.id} className="border-border/50">
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-semibold text-sm text-foreground">{f.nome_completo}</p>
                      <p className="text-xs text-muted-foreground font-mono">{maskCPF(f.cpf)}</p>
                      {f.cargo && <p className="text-xs text-muted-foreground">{f.cargo}</p>}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {f.horario_entrada} – {f.horario_saida} <span className="opacity-60">(int: {f.intervalo || "01:00"})</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(f)} className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(f.id)} className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
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
