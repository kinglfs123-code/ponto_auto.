import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { maskCNPJ, validateCNPJ, maskHM } from "@/lib/ponto-rules";
import { Plus, Trash2, Building2, Pencil } from "lucide-react";
import NavBar from "@/components/NavBar";
import type { Empresa } from "@/types";

export default function Empresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [jornada, setJornada] = useState("07:20");
  const [loading, setLoading] = useState(false);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editEmpresa, setEditEmpresa] = useState<Empresa | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editCnpj, setEditCnpj] = useState("");
  const [editJornada, setEditJornada] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("empresas").select("*").order("created_at");
    if (data) setEmpresas(data);
  };

  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !validateCNPJ(cnpj)) {
      toast({ title: "Dados inválidos", description: "Preencha nome e CNPJ válido (14 dígitos).", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("empresas").insert({
      owner_id: user.id,
      cnpj: cnpj.replace(/\D/g, ""),
      nome: nome.trim(),
      jornada_padrao: jornada || "07:20",
    });
    if (error) {
      toast({ title: "Erro ao adicionar", description: error.message, variant: "destructive" });
    } else {
      setNome(""); setCnpj(""); setJornada("07:20");
      toast({ title: "Empresa adicionada" });
      load();
    }
    setLoading(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Remover empresa e todos os dados vinculados?")) return;
    await supabase.from("empresas").delete().eq("id", id);
    toast({ title: "Empresa removida" });
    load();
  };

  const openEdit = (emp: Empresa) => {
    setEditEmpresa(emp);
    setEditNome(emp.nome);
    setEditCnpj(maskCNPJ(emp.cnpj));
    setEditJornada(emp.jornada_padrao);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editEmpresa) return;
    if (!editNome.trim() || !validateCNPJ(editCnpj)) {
      toast({ title: "Dados inválidos", description: "Preencha nome e CNPJ válido.", variant: "destructive" });
      return;
    }
    setEditLoading(true);
    const { error } = await supabase.from("empresas").update({
      nome: editNome.trim(),
      cnpj: editCnpj.replace(/\D/g, ""),
      jornada_padrao: editJornada || "07:20",
    }).eq("id", editEmpresa.id);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Empresa atualizada" });
      setEditOpen(false);
      load();
    }
    setEditLoading(false);
  };

  return (
    <div className="min-h-screen bg-background pb-44">
      <NavBar />
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <h1 className="text-2xl font-bold text-foreground tracking-tight animate-fade-in">Empresas</h1>

        <Card className="animate-fade-in">
          <CardContent className="pt-4">
            <form onSubmit={add} className="space-y-3">
              <Input placeholder="Nome da empresa" value={nome} onChange={(e) => setNome(e.target.value)} />
              <Input placeholder="CNPJ" value={cnpj} onChange={(e) => setCnpj(maskCNPJ(e.target.value))} maxLength={18} />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Jornada:</span>
                <Input value={jornada} onChange={(e) => setJornada(maskHM(e.target.value))} className="w-20" maxLength={5} placeholder="07:20" />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Adicionando..." : "Adicionar empresa"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {empresas.length === 0 ? (
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
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{emp.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        CNPJ: {maskCNPJ(emp.cnpj)} · Jornada: {emp.jornada_padrao}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEdit(emp); }} className="h-8 w-8 text-muted-foreground hover:text-primary">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); remove(emp.id); }} className="h-8 w-8 text-muted-foreground hover:text-destructive">
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
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar empresa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input placeholder="Nome da empresa" value={editNome} onChange={(e) => setEditNome(e.target.value)} />
            <Input placeholder="CNPJ" value={editCnpj} onChange={(e) => setEditCnpj(maskCNPJ(e.target.value))} maxLength={18} />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Jornada:</span>
              <Input value={editJornada} onChange={(e) => setEditJornada(maskHM(e.target.value))} className="w-20" maxLength={5} placeholder="07:20" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={editLoading}>
              {editLoading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
