
"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, getAuth } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Rocket, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const auth = getAuth();

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Bem-vindo!", description: "Login realizado com sucesso." });
      router.push("/");
    } catch (error: any) {
      console.error("Erro de autenticação:", error.code, error.message);
      
      let errorMessage = "E-mail ou senha inválidos.";
      
      if (error.code === 'auth/invalid-api-key') {
        errorMessage = "Configuração do Firebase inválida (API Key incorreta). Verifique src/firebase/config.ts";
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = "O provedor de E-mail/Senha está desativado no Console do Firebase.";
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = "Erro de rede. Verifique sua conexão ou as configurações do Firebase.";
      }

      toast({
        variant: "destructive",
        title: "Erro no login",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

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
                <Input
                  id="email"
                  type="email"
                  placeholder="nome@empresa.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full h-12 font-bold" disabled={loading}>
                {loading ? "Entrando..." : "Entrar na Jornada"}
              </Button>
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-[10px] text-amber-800 leading-tight">
                  Certifique-se de que o provedor <strong>E-mail/Senha</strong> está ativo no Console do Firebase e que os dados em <code>src/firebase/config.ts</code> estão corretos.
                </p>
              </div>
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
