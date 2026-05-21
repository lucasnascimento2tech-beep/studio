"use client";

import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, getAuth } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Rocket, AlertCircle, Loader2 } from "lucide-react";
import { useUser } from "@/firebase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, loading } = useUser();

  useEffect(() => {
    if (!loading && user) {
      const redirect = searchParams.get("redirect");
      if (redirect) {
        router.push(redirect);
        return;
      }

      // Redirecionamento por Perfil
      switch (user.globalRole) {
        case 'admin_2tech':
          // TODO: Mover para /admin quando a rota for criada
          router.push("/implantador"); 
          break;
        case 'implantador':
          router.push("/implantador");
          break;
        case 'client_master':
        case 'client_participant':
          router.push("/");
          break;
        default:
          router.push("/");
      }
    }
  }, [user, loading, router, searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    const auth = getAuth();

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Bem-vindo!", description: "Login realizado com sucesso." });
    } catch (error: any) {
      console.error("Erro de autenticação:", error.code, error.message);
      
      let errorMessage = "E-mail ou senha inválidos.";
      if (error.code === 'auth/invalid-api-key') errorMessage = "Configuração do Firebase inválida.";
      else if (error.code === 'auth/operation-not-allowed') errorMessage = "E-mail/Senha desativado no Firebase.";
      
      toast({ variant: "destructive", title: "Erro no login", description: errorMessage });
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="bg-primary text-white w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Rocket className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-headline font-bold text-slate-900">Guia 2tech</h1>
          <p className="text-slate-500 mt-2">Jornada Guiada de Implantação</p>
        </div>

        <Card className="border-none shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">Acesse sua conta</CardTitle>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail corporativo</Label>
                <Input id="email" type="email" placeholder="nome@empresa.com.br" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full h-12 font-bold" disabled={isLoggingIn}>
                {isLoggingIn ? "Entrando..." : "Entrar na Jornada"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4" /> Plataforma Segura 2tech
        </p>
      </div>
    </div>
  );
}
