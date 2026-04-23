import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ArrowRight, User, Loader2 } from "lucide-react";
import loginBg from "@/assets/login-bg.webp";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const today = useMemo(() => {
    const d = new Date();
    const formatted = d.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }, []);

  const initial = useMemo(() => email.trim().charAt(0).toUpperCase(), [email]);
  const displayName = email.trim() || "Entrar";

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
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Background image */}
      <img
        src={loginBg}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover scale-[1.05]"
      />
      {/* Soft overlay for legibility */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.0) 35%, rgba(0,0,0,0.0) 65%, rgba(0,0,0,0.25) 100%)",
        }}
      />

      
        </p>
      </div>

      {/* Center-bottom: avatar + login */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center pb-12 sm:pb-20 px-6">
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-3 w-full max-w-[320px]">
          {/* Avatar */}
          <div
            className="liquid-glass !rounded-full h-[68px] w-[68px] flex items-center justify-center text-white text-2xl font-light"
            style={{
              background: "rgba(255,255,255,0.18)",
              border: "1px solid rgba(255,255,255,0.35)",
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
            }}
            aria-hidden="true"
          >
            {initial ? initial : <User className="h-8 w-8" />}
          </div>

          {/* Name / email preview */}
          <p
            className="text-white text-[15px] font-medium tracking-tight max-w-full truncate"
            style={{ textShadow: "0 1px 8px rgba(0,0,0,0.35)" }}
          >
            {displayName}
          </p>

          {/* Unified input pill (email + password) */}
          <div
            className="liquid-glass w-full !rounded-2xl overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.18)",
              border: "1px solid rgba(255,255,255,0.30)",
            }}
          >
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent px-4 py-2.5 text-[14px] text-white placeholder:text-white/70 outline-none border-0"
              style={{ caretColor: "white" }}
            />
            <div className="h-px w-full bg-white/25" />
            <div className="flex items-center">
              <input
                type="password"
                required
                minLength={6}
                autoComplete={isSignUp ? "new-password" : "current-password"}
                placeholder={isSignUp ? "Crie uma senha" : "Digite a senha"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 bg-transparent px-4 py-2.5 text-[14px] text-white placeholder:text-white/70 outline-none border-0"
                style={{ caretColor: "white" }}
              />
              <button
                type="submit"
                disabled={loading}
                aria-label={isSignUp ? "Cadastrar" : "Entrar"}
                className="btn-press mr-1.5 my-1 h-9 w-9 rounded-full flex items-center justify-center text-white disabled:opacity-50 transition-colors hover:bg-white/30"
                style={{
                  background: "rgba(255,255,255,0.22)",
                  border: "1px solid rgba(255,255,255,0.40)",
                  backdropFilter: "blur(20px) saturate(180%)",
                  WebkitBackdropFilter: "blur(20px) saturate(180%)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), 0 1px 2px rgba(0,0,0,0.08)",
                }}
              >
                {loading ? (
                  <Loader2 className="h-[18px] w-[18px] animate-spin" />
                ) : (
                  <ArrowRight className="h-[18px] w-[18px]" strokeWidth={2.5} />
                )}
              </button>
            </div>
          </div>

          {/* Helper text */}
          <p
            className="text-white/80 text-[12px] mt-1"
            style={{ textShadow: "0 1px 6px rgba(0,0,0,0.30)" }}
          >
            {isSignUp
              ? "Crie uma conta para começar."
              : "Sua senha é necessária para iniciar sessão."}
          </p>

          {/* Toggle signup/login */}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-white/85 hover:text-white transition-colors text-[12px] mt-2"
            style={{ textShadow: "0 1px 6px rgba(0,0,0,0.30)" }}
          >
            {isSignUp ? "Já tem conta? Entrar" : "Não tem conta? Cadastrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
