import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { maskCNPJ, validateCNPJ, maskHM } from "@/lib/ponto-rules";
import { Plus, Trash2, Building2 } from "lucide-react";
import NavBar from "@/components/NavBar";

interface Empresa {
  id: string;
  cnpj: string;
  nome: string;
  jornada_padrao: string;
}

export default function Empresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [jornada, setJornada] = useState("07:20");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("empresas").select("*").order("created_at");
    if (data) setEmpresas(data);
  };

  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !validateCNPJ(cnpj)) {
      toast({ title: "Preencha nome e CNPJ válido (14 dígitos)", variant: "destructive" });
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
      toast({ title: "Empresa adicionada!" });
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

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <NavBar />
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <h1 className="text-xl font-bold text-foreground animate-fade-in">Empresas</h1>

        <Card className="animate-fade-in border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base text-primary">
              <Plus className="h-4 w-4" /> Nova Empresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={add} className="space-y-3">
              <Input placeholder="Nome da empresa" value={nome} onChange={(e) => setNome(e.target.value)} className="bg-muted/30 border-border/50" />
              <Input placeholder="CNPJ" value={cnpj} onChange={(e) => setCnpj(maskCNPJ(e.target.value))} maxLength={18} className="bg-muted/30 border-border/50" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Jornada:</span>
                <Input value={jornada} onChange={(e) => setJornada(maskHM(e.target.value))} className="w-20 bg-muted/30 border-border/50" maxLength={5} placeholder="07:20" />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Adicionando..." : "Adicionar Empresa"}
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
                className="animate-fade-in border-border/50 hover:border-primary/20 transition-colors"
                style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}
              >
                <CardContent className="flex items-center justify-between py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{emp.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        CNPJ: {maskCNPJ(emp.cnpj)} · Jornada: {emp.jornada_padrao}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(emp.id)} className="text-muted-foreground hover:text-destructive h-8 w-8">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
