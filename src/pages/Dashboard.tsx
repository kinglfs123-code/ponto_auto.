import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ClipboardList, FileText, Plus, ArrowRight, Users, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { maskCNPJ } from "@/lib/ponto-rules";
import NavBar from "@/components/NavBar";
import { useWorkflowStatus, isRouteEnabled, getRouteMessage } from "@/hooks/use-workflow-status";
import { toast } from "sonner";
import type { Empresa } from "@/types";

export default function Dashboard() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [folhasCount, setFolhasCount] = useState(0);
  const [relatoriosCount, setRelatoriosCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const workflow = useWorkflowStatus();

  useEffect(() => {
    Promise.all([
      supabase.from("empresas").select("*"),
      supabase.from("folhas_ponto").select("id", { count: "exact", head: true }),
      supabase.from("relatorios").select("id", { count: "exact", head: true }),
    ]).then(([emp, fol, rel]) => {
      if (emp.data) setEmpresas(emp.data);
      setFolhasCount(fol.count || 0);
      setRelatoriosCount(rel.count || 0);
      setLoading(false);
    });
  }, []);

              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
