import { useRef } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export interface ImportedRecord {
  funcionario: string;
  data: string;
  hora_entrada: string;
  hora_saida: string;
}

interface Props {
  onImport: (records: ImportedRecord[]) => void;
}

function normalizeRecords(rows: Record<string, string>[]): ImportedRecord[] {
  return rows
    .filter((r) => r.funcionario || r.nome || r.employee)
    .map((r) => ({
      funcionario: r.funcionario || r.nome || r.employee || "",
      data: r.data || r.date || r.dia || "",
      hora_entrada: r.hora_entrada || r.entrada || r.check_in || r.in || "",
      hora_saida: r.hora_saida || r.saida || r.check_out || r.out || "",
    }));
}

export default function FileImporter({ onImport }: Props) {
  const ref = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "json") {
      file.text().then((text) => {
        try {
          const data = JSON.parse(text);
          const rows = Array.isArray(data) ? data : data.registros || data.records || [];
          onImport(normalizeRecords(rows));
        } catch {
          alert("JSON inválido");
        }
      });
    } else if (ext === "csv" || ext === "txt") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          onImport(normalizeRecords(result.data as Record<string, string>[]));
        },
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wb = XLSX.read(e.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws);
        onImport(normalizeRecords(rows));
      };
      reader.readAsBinaryString(file);
    } else {
      alert("Formato não suportado. Use CSV, JSON ou Excel.");
    }
  };

  return (
    <div>
      <input
        ref={ref}
        type="file"
        accept=".csv,.json,.xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <Button variant="outline" onClick={() => ref.current?.click()} className="gap-2">
        <Upload className="h-4 w-4" />
        Importar Arquivo (CSV/JSON/Excel)
      </Button>
    </div>
  );
}
