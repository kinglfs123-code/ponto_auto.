import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import NavBar from "@/components/NavBar";
import EmpresaSelector from "@/components/EmpresaSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { maskCPF, validateCPF, maskHM } from "@/lib/ponto-rules";
import { Pencil, Trash2, Plus, X } from "lucide-react";

interface Empresa { id: string; cnpj: string; nome: string; jornada_padrao: string }

interface Funcionario {
  id: string;
  empresa_id: string;
  nome_completo: string;
  cpf: string;
  email: string | null;
  data_nascimento: string | null;
  cargo: string | null;
  horario_entrada: string;
  horario_saida: string;
}

const empty: Omit<Funcionario, "id" | "empresa_id"> = {
  nome_completo: "",
  cpf: "",
  email: "",
  data_nascimento: "",
  cargo: "",
  horario_entrada: "08:00",
  horario_saida: "17:00",
};

export default function Funcionarios() {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!empresa) { setFuncionarios([]); return; }
    supabase
      .from("funcionarios")
      .select("*")
      .eq("empresa_id", empresa.id)
      .order("nome_completo")
      .then(({ data, error }) => {
        if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
        else setFuncionarios((data as Funcionario[]) || []);
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
      // reload
      const { data } = await supabase.from("funcionarios").select("*").eq("empresa_id", empresa.id).order("nome_completo");
      setFuncionarios((data as Funcionario[]) || []);
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
    <div className="min-h-screen bg-background">
      <NavBar />
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <h1 className="text-2xl font-bold text-foreground">Funcionários</h1>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Empresa</Label>
            <EmpresaSelector value={empresa?.id || null} onChange={setEmpresa} />
          </div>
          {empresa && (
            <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }} className="gap-1">
              <Plus className="h-4 w-4" /> Novo Funcionário
            </Button>
          )}
        </div>

        {showForm && empresa && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{editId ? "Editar" : "Novo"} Funcionário</CardTitle>
                <Button variant="ghost" size="icon" onClick={resetForm}><X className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Nome completo *</Label>
                <Input value={form.nome_completo} onChange={(e) => setForm({ ...form, nome_completo: e.target.value })} />
              </div>
              <div>
                <Label>CPF *</Label>
                <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: maskCPF(e.target.value) })} placeholder="000.000.000-00" />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <Label>Data de Nascimento</Label>
                <Input type="date" value={form.data_nascimento || ""} onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} />
              </div>
              <div>
                <Label>Cargo</Label>
                <Input value={form.cargo || ""} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label>Entrada</Label>
                  <Input value={form.horario_entrada} onChange={(e) => setForm({ ...form, horario_entrada: maskHM(e.target.value) })} placeholder="08:00" />
                </div>
                <div className="flex-1">
                  <Label>Saída</Label>
                  <Input value={form.horario_saida} onChange={(e) => setForm({ ...form, horario_saida: maskHM(e.target.value) })} placeholder="17:00" />
                </div>
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button onClick={handleSave} disabled={loading}>{loading ? "Salvando…" : "Salvar"}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {empresa && funcionarios.length === 0 && !showForm && (
          <p className="text-muted-foreground text-sm">Nenhum funcionário cadastrado para esta empresa.</p>
        )}

        {funcionarios.length > 0 && (
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 font-medium text-muted-foreground">Nome</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">CPF</th>
                  <th className="text-left p-2 font-medium text-muted-foreground hidden sm:table-cell">Cargo</th>
                  <th className="text-left p-2 font-medium text-muted-foreground hidden md:table-cell">Horário</th>
                  <th className="p-2 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {funcionarios.map((f) => (
                  <tr key={f.id} className="border-t border-border">
                    <td className="p-2 text-foreground">{f.nome_completo}</td>
                    <td className="p-2 text-foreground">{maskCPF(f.cpf)}</td>
                    <td className="p-2 text-muted-foreground hidden sm:table-cell">{f.cargo || "—"}</td>
                    <td className="p-2 text-muted-foreground hidden md:table-cell">{f.horario_entrada} – {f.horario_saida}</td>
                    <td className="p-2 flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(f)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(f.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
