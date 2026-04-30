import MarketingLayout from "@/components/marketing/MarketingLayout";
import { Megaphone } from "lucide-react";

export default function MarketingHome() {
  return (
    <MarketingLayout title="Marketing">
      <div className="liquid-glass !rounded-3xl p-10 text-center space-y-4 animate-fade-in">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
          <Megaphone className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-semibold">Em breve</h2>
        <p className="text-muted-foreground max-w-md mx-auto text-sm">
          Defina aqui as métricas de campanhas, investimento por canal e retorno —
          a estrutura está pronta para receber o conteúdo no próximo passo.
        </p>
      </div>
    </MarketingLayout>
  );
}
