import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import NavBar from "@/components/NavBar";
import { useEmpresa } from "@/contexts/EmpresaContext";
import { maskCPF, validateCPF, maskHM } from "@/lib/ponto-rules";
import { Paperclip, Trash2, Download, Loader2 } from "lucide-react";
import type { Funcionario, Empresa } from "@/types";

type Status = "Ativo" | "Férias" | "Desligado";

interface ArquivoItem {
  name: string;
  path: string;
  size: number;
}

const DOC_LIST = ["Contrato assinado", "Ficha PI / EPI", "ASO", "Outros"] as const;
type DocKey = (typeof DOC_LIST)[number];

export default function RHControl() {
  const { empresa, setEmpresa } = useEmpresa();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [arquivos, setArquivos] = useState<ArquivoItem[]>([]);
  const [docsChecked, setDocsChecked] = useState<Record<DocKey, boolean>>({
    "Contrato assinado": false,
    "Ficha PI / EPI": false,
    "ASO": false,
    "Outros": false,
  });

  const [form, setForm] = useState({
    nome_completo: "",
    cpf: "",
    cargo: "",
    email: "",
    data_admissao: "",
    status: "Ativo" as Status,
    venc_contrato: "",
    prorrogacao: "",
    ferias: "",
    horario_entrada: "08:00",
    horario_saida: "17:00",
    intervalo: "01:00",
  });

  // load empresas
  useEffect(() => {
    supabase.from("empresas").select("*").order("nome").then(({ data }) => {
      setEmpresas((data as Empresa[]) || []);
    });
  }, []);

  // load funcionários
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

  // load arquivos when selected funcionário changes
  useEffect(() => {
    loadArquivos();
  }, [selectedId]);

  const loadArquivos = async () => {
    if (!selectedId) { setArquivos([]); return; }
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return;
    const folder = `${uid}/${selectedId}`;
    const { data, error } = await supabase.storage.from("colaborador-arquivos").list(folder);
    if (error) return;
    setArquivos(
      (data || [])
        .filter((f) => f.name && !f.name.startsWith("."))
        .map((f) => ({ name: f.name, path: `${folder}/${f.name}`, size: (f.metadata as any)?.size || 0 }))
    );
  };

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return funcionarios;
    return funcionarios.filter(
      (f) =>
        f.nome_completo.toLowerCase().includes(s) ||
        f.cpf.includes(s.replace(/\D/g, "")) ||
        (f.cargo || "").toLowerCase().includes(s)
    );
  }, [funcionarios, search]);

  const resetForm = () => {
    setForm({
      nome_completo: "",
      cpf: "",
      cargo: "",
      email: "",
      data_admissao: "",
      status: "Ativo",
      venc_contrato: "",
      prorrogacao: "",
      ferias: "",
      horario_entrada: "08:00",
      horario_saida: "17:00",
      intervalo: "01:00",
    });
    setSelectedId(null);
    setDocsChecked({
      "Contrato assinado": false,
      "Ficha PI / EPI": false,
      "ASO": false,
      "Outros": false,
    });
  };

  const handleSelectFuncionario = (f: Funcionario) => {
    setSelectedId(f.id);
    setForm({
      nome_completo: f.nome_completo,
      cpf: maskCPF(f.cpf),
      cargo: f.cargo || "",
      email: f.email || "",
      data_admissao: "",
      status: "Ativo",
      venc_contrato: "",
      prorrogacao: "",
      ferias: "",
      horario_entrada: f.horario_entrada,
      horario_saida: f.horario_saida,
      intervalo: f.intervalo || "01:00",
    });
  };

  const handleSave = async () => {
    if (!empresa) {
      toast({ title: "Selecione uma empresa", variant: "destructive" });
      return;
    }
    if (!form.nome_completo.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    if (!validateCPF(form.cpf)) {
      toast({ title: "CPF inválido (11 dígitos)", variant: "destructive" });
      return;
    }

    setLoading(true);
    const payload = {
      empresa_id: empresa.id,
      nome_completo: form.nome_completo.trim(),
      cpf: form.cpf.replace(/\D/g, ""),
      email: form.email?.trim() || null,
      cargo: form.cargo?.trim() || null,
      horario_entrada: form.horario_entrada || "08:00",
      horario_saida: form.horario_saida || "17:00",
      intervalo: form.intervalo || "01:00",
    };

    const { error } = selectedId
      ? await supabase.from("funcionarios").update(payload).eq("id", selectedId)
      : await supabase.from("funcionarios").insert(payload);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: selectedId ? "Atualizado!" : "Cadastrado!" });
      const { data } = await supabase
        .from("funcionarios")
        .select("*")
        .eq("empresa_id", empresa.id)
        .order("nome_completo");
      setFuncionarios((data as Funcionario[]) || []);
      if (!selectedId) resetForm();
    }
    setLoading(false);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!selectedId) {
      toast({ title: "Selecione um colaborador antes", variant: "destructive" });
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return;

    setUploading(true);
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: `${file.name} excede 10MB`, variant: "destructive" });
        continue;
      }
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${uid}/${selectedId}/${Date.now()}_${safeName}`;
      const { error } = await supabase.storage
        .from("colaborador-arquivos")
        .upload(path, file, { upsert: false });
      if (error) {
        toast({ title: `Erro: ${file.name}`, description: error.message, variant: "destructive" });
      }
    }
    setUploading(false);
    await loadArquivos();
    toast({ title: "Arquivos enviados!" });
  };

  const handleDownload = async (path: string, name: string) => {
    const { data, error } = await supabase.storage.from("colaborador-arquivos").download(path);
    if (error || !data) {
      toast({ title: "Erro ao baixar", variant: "destructive" });
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteFile = async (path: string) => {
    const { error } = await supabase.storage.from("colaborador-arquivos").remove([path]);
    if (error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
      return;
    }
    await loadArquivos();
    toast({ title: "Arquivo excluído" });
  };

  // Inputs styling: dark terminal aesthetic
  const inputBase =
    "w-full p-3 bg-[#121212] border border-[#3a3a3a] text-[#e0e0e0] font-mono text-sm focus:outline-none focus:border-[#0088ff] focus:ring-4 focus:ring-[#0088ff]/10 transition-all placeholder:text-[#606060] rounded-none";
  const labelBase = "text-xs text-[#a0a0a0] font-medium";
  const sectionTitle =
    "flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#606060] font-semibold mb-6";

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <NavBar />
      <div className="bg-[#0a0a0a] text-[#e0e0e0] p-4 md:p-8 min-h-[calc(100vh-4rem)]">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 bg-[#1a1a1a] border border-[#2a2a2a] border-b-2 border-b-[#00ff88] mb-8">
            <h1 className="font-mono text-base md:text-lg font-semibold tracking-tight">
              RH CONTROL{" "}
              <span className="text-[#606060] font-normal">| Cadastro de Colaboradores</span>
            </h1>
          </div>

          {/* Empresa selector */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-6 mb-6">
            <div className="text-xs uppercase tracking-wider text-[#606060] font-medium mb-3">
              Empresa ativa
            </div>
            <select
              value={empresa?.id || ""}
              onChange={(e) => {
                const emp = empresas.find((x) => x.id === e.target.value) || null;
                setEmpresa(emp);
                resetForm();
              }}
              className={inputBase}
            >
              <option value="">Selecione uma empresa</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Search Section */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] p-6 md:p-8 mb-6">
            <div className="text-xs uppercase tracking-wider text-[#606060] font-medium mb-3">
              Buscar nome / CPF / cargo
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Digite para buscar..."
              className="w-full p-3.5 bg-[#121212] border border-[#3a3a3a] text-[#e0e0e0] font-mono text-sm focus:outline-none focus:border-[#00ff88] focus:ring-4 focus:ring-[#00ff88]/10 transition-all placeholder:text-[#606060]"
            />
            <div className="flex flex-wrap gap-3 mt-6">
              <button
                onClick={resetForm}
                className="px-6 py-3 text-sm font-semibold bg-[#00ff88] text-[#0a0a0a] border border-[#00ff88] hover:bg-[#00dd77] transition-all"
              >
                Novo cadastro
              </button>
              <button
                onClick={() =>
                  document.getElementById("rh-arquivos")?.scrollIntoView({ behavior: "smooth" })
                }
                className="px-6 py-3 text-sm font-medium bg-[#121212] text-[#e0e0e0] border border-[#3a3a3a] hover:bg-[#1a1a1a] hover:border-[#a0a0a0] transition-all"
              >
                Documentos
              </button>
              <button
                onClick={() =>
                  document.getElementById("rh-prazos")?.scrollIntoView({ behavior: "smooth" })
                }
                className="px-6 py-3 text-sm font-medium bg-[#121212] text-[#e0e0e0] border border-[#3a3a3a] hover:bg-[#1a1a1a] hover:border-[#a0a0a0] transition-all"
              >
                Vencimentos
              </button>
            </div>

            {/* Lista de colaboradores filtrados */}
            {empresa && filtered.length > 0 && (
              <div className="mt-6 max-h-48 overflow-y-auto border border-[#2a2a2a] divide-y divide-[#2a2a2a]">
                {filtered.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleSelectFuncionario(f)}
                    className={`w-full text-left p-3 text-sm font-mono hover:bg-[#121212] transition-all flex justify-between items-center ${
                      selectedId === f.id ? "bg-[#121212] border-l-2 border-l-[#00ff88]" : ""
                    }`}
                  >
                    <span className="text-[#e0e0e0]">{f.nome_completo}</span>
                    <span className="text-[#606060] text-xs">{maskCPF(f.cpf)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Form Card */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a]">
            {/* Colaborador Section */}
            <div className="p-6 md:p-8 border-b border-[#2a2a2a]">
              <div className={sectionTitle}>
                <div className="w-0.5 h-3 bg-[#00ff88]"></div>
                Colaborador
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 flex flex-col gap-2">
                  <label className={labelBase}>Nome completo</label>
                  <input
                    type="text"
                    value={form.nome_completo}
                    onChange={(e) => setForm({ ...form, nome_completo: e.target.value })}
                    placeholder="Ex: João da Silva Santos"
                    className={inputBase}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className={labelBase}>CPF</label>
                  <input
                    type="text"
                    value={form.cpf}
                    onChange={(e) => setForm({ ...form, cpf: maskCPF(e.target.value) })}
                    placeholder="000.000.000-00"
                    className={inputBase}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className={labelBase}>E-mail</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="email@empresa.com"
                    className={inputBase}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className={labelBase}>Cargo</label>
                  <input
                    type="text"
                    value={form.cargo}
                    onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                    placeholder="Ex: Analista de RH"
                    className={inputBase}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className={labelBase}>Data de admissão</label>
                  <input
                    type="date"
                    value={form.data_admissao}
                    onChange={(e) => setForm({ ...form, data_admissao: e.target.value })}
                    className={inputBase}
                  />
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className={labelBase}>Status</label>
                  <div className="flex gap-2">
                    {(["Ativo", "Férias", "Desligado"] as Status[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setForm({ ...form, status: s })}
                        className={`flex-1 p-3 border text-sm font-medium text-center transition-all ${
                          form.status === s
                            ? "bg-[#00ff88] text-[#0a0a0a] border-[#00ff88]"
                            : "bg-[#121212] text-[#a0a0a0] border-[#3a3a3a] hover:border-[#a0a0a0]"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className={labelBase}>Entrada</label>
                  <input
                    value={form.horario_entrada}
                    onChange={(e) =>
                      setForm({ ...form, horario_entrada: maskHM(e.target.value) })
                    }
                    placeholder="08:00"
                    className={inputBase}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className={labelBase}>Saída</label>
                  <input
                    value={form.horario_saida}
                    onChange={(e) =>
                      setForm({ ...form, horario_saida: maskHM(e.target.value) })
                    }
                    placeholder="17:00"
                    className={inputBase}
                  />
                </div>
              </div>
            </div>

            {/* Prazos Section */}
            <div id="rh-prazos" className="p-6 md:p-8 border-b border-[#2a2a2a]">
              <div className={sectionTitle}>
                <div className="w-0.5 h-3 bg-[#00ff88]"></div>
                Prazos
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                  <label className={labelBase}>Vencimento contrato</label>
                  <input
                    type="date"
                    value={form.venc_contrato}
                    onChange={(e) => setForm({ ...form, venc_contrato: e.target.value })}
                    className="p-3 bg-[#121212] border border-[#3a3a3a] text-[#e0e0e0] font-mono text-sm focus:outline-none focus:border-[#ffcc00] focus:ring-4 focus:ring-[#ffcc00]/10 transition-all rounded-none"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className={labelBase}>Prorrogação</label>
                  <input
                    type="date"
                    value={form.prorrogacao}
                    onChange={(e) => setForm({ ...form, prorrogacao: e.target.value })}
                    className="p-3 bg-[#121212] border border-[#3a3a3a] text-[#e0e0e0] font-mono text-sm focus:outline-none focus:border-[#ffcc00] focus:ring-4 focus:ring-[#ffcc00]/10 transition-all rounded-none"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className={labelBase}>Férias</label>
                  <input
                    type="date"
                    value={form.ferias}
                    onChange={(e) => setForm({ ...form, ferias: e.target.value })}
                    className="p-3 bg-[#121212] border border-[#3a3a3a] text-[#e0e0e0] font-mono text-sm focus:outline-none focus:border-[#ffcc00] focus:ring-4 focus:ring-[#ffcc00]/10 transition-all rounded-none"
                  />
                </div>
              </div>
            </div>

            {/* Documentos Section */}
            <div className="p-6 md:p-8 border-b border-[#2a2a2a]">
              <div className={sectionTitle}>
                <div className="w-0.5 h-3 bg-[#00ff88]"></div>
                Documentos
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DOC_LIST.map((doc) => (
                  <label
                    key={doc}
                    className="flex items-center gap-3 p-3 bg-[#121212] border border-[#3a3a3a] cursor-pointer hover:border-[#a0a0a0] transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={docsChecked[doc]}
                      onChange={(e) =>
                        setDocsChecked({ ...docsChecked, [doc]: e.target.checked })
                      }
                      className="w-[18px] h-[18px] accent-[#00ff88]"
                    />
                    <span className="text-sm text-[#e0e0e0]">{doc}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Arquivos Section */}
            <div id="rh-arquivos" className="p-6 md:p-8">
              <div className={sectionTitle}>
                <div className="w-0.5 h-3 bg-[#00ff88]"></div>
                Arquivos
              </div>
              <label className="block border-2 border-dashed border-[#3a3a3a] bg-[#121212] p-8 md:p-12 text-center cursor-pointer hover:border-[#0088ff] hover:bg-[#0a0a0a] transition-all">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="hidden"
                  disabled={uploading || !selectedId}
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
                <div className="text-4xl text-[#606060] mb-4 flex justify-center">
                  {uploading ? <Loader2 className="h-10 w-10 animate-spin" /> : <Paperclip className="h-10 w-10" />}
                </div>
                <div className="text-sm text-[#a0a0a0] mb-2">
                  {selectedId
                    ? "Clique ou arraste arquivos para anexar"
                    : "Selecione um colaborador para anexar arquivos"}
                </div>
                <div className="text-xs text-[#606060] font-mono">
                  PDF, DOCX, JPEG, PNG (máx 10MB)
                </div>
              </label>

              {arquivos.length > 0 && (
                <div className="mt-4 divide-y divide-[#2a2a2a] border border-[#2a2a2a]">
                  {arquivos.map((a) => (
                    <div key={a.path} className="flex items-center justify-between p-3 bg-[#121212]">
                      <span className="text-sm text-[#e0e0e0] font-mono truncate flex-1 mr-3">
                        {a.name}
                      </span>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleDownload(a.path, a.name)}
                          className="p-2 bg-[#0a0a0a] border border-[#3a3a3a] hover:border-[#0088ff] transition-all"
                          title="Baixar"
                        >
                          <Download className="h-4 w-4 text-[#a0a0a0]" />
                        </button>
                        <button
                          onClick={() => handleDeleteFile(a.path)}
                          className="p-2 bg-[#0a0a0a] border border-[#3a3a3a] hover:border-[#ff4444] transition-all"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4 text-[#ff4444]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Save bar */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={resetForm}
              className="px-6 py-3 text-sm font-medium bg-[#121212] text-[#e0e0e0] border border-[#3a3a3a] hover:bg-[#1a1a1a] hover:border-[#a0a0a0] transition-all"
            >
              Limpar
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-3 text-sm font-semibold bg-[#00ff88] text-[#0a0a0a] border border-[#00ff88] hover:bg-[#00dd77] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {selectedId ? "Atualizar" : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
