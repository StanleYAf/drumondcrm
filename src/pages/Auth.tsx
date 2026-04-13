import { useState } from "react";
import { useAuth } from "@/lib/authContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-5 animate-in fade-in zoom-in-95 duration-500">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-[3px] border-muted" />
            <div className="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-primary border-t-transparent animate-spin" />
          </div>
          <p className="text-sm text-muted-foreground">Verificando sessão...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }
    if (!isLogin && password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setSubmitting(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error === "Invalid login credentials" ? "Email ou senha incorretos" : error);
        } else {
          toast.success("Login realizado com sucesso!");
        }
      } else {
        const { error } = await signUp(email, password, displayName);
        if (error) {
          toast.error(error);
        } else {
          toast.success("Conta criada! Verifique seu email para confirmar o cadastro.");
        }
      }
    } catch {
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
            {isLogin ? (
              <LogIn className="w-6 h-6 text-primary" />
            ) : (
              <UserPlus className="w-6 h-6 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            {isLogin ? "Entrar" : "Criar Conta"}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {isLogin
              ? "Acesse o painel comercial com suas credenciais"
              : "Crie sua conta para começar a gerenciar suas vendas"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">Nome</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome completo"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-secondary border-border text-foreground"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-secondary border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={isLogin ? "Sua senha" : "Mínimo 6 caracteres"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-secondary border-border text-foreground pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {isLogin && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={async () => {
                    if (!email) {
                      toast.error("Digite seu email primeiro");
                      return;
                    }
                    setSubmitting(true);
                    const { supabase } = await import("@/integrations/supabase/client");
                    const { error } = await supabase.auth.resetPasswordForEmail(email, {
                      redirectTo: `${window.location.origin}/reset-password`,
                    });
                    setSubmitting(false);
                    if (error) {
                      toast.error(error.message);
                    } else {
                      toast.success("Email de redefinição enviado! Verifique sua caixa de entrada.");
                    }
                  }}
                  className="text-sm text-primary hover:underline transition-colors"
                >
                  Esqueci minha senha
                </button>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : isLogin ? (
                "Entrar"
              ) : (
                "Criar Conta"
              )}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setPassword("");
              }}
              className="text-sm text-primary hover:underline transition-colors"
            >
              {isLogin ? "Não tem conta? Cadastre-se" : "Já tem conta? Faça login"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
