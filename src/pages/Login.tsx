import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ClipboardList } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast({ title: "Cadastro realizado!", description: "Verifique seu email para confirmar." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      }
    } catch (err: unknown) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Gradient orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-primary/8 blur-[80px] pointer-events-none" />

      <Card className="w-full max-w-sm animate-fade-in border-border/50 bg-card/80 backdrop-blur-sm shadow-2xl shadow-primary/5">
        <CardHeader className="text-center pb-2 pt-8">
          <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-primary/15 flex items-center justify-center">
            <ClipboardList className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-primary font-mono">
            FOLHA DE PONTO
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isSignUp ? "Crie sua conta" : "Entre na sua conta"}
          </p>
        </CardHeader>
        <CardContent className="pt-2">
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-muted/50 border-border/50 focus:border-primary/50"
            />
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="bg-muted/50 border-border/50 focus:border-primary/50"
            />
            <Button type="submit" className="w-full font-semibold" disabled={loading}>
              {loading ? "..." : isSignUp ? "Cadastrar" : "Entrar"}
            </Button>
          </form>
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full mt-4 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {isSignUp ? "Já tem conta? Entrar" : "Não tem conta? Cadastrar"}
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
