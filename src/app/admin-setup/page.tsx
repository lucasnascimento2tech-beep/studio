
"use client";

import { useState } from "react";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useUser } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, UserCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminSetupPage() {
  const { user, loading } = useUser();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const promoteToAdmin = async (role: 'admin_2tech' | 'implantador') => {
    if (!user) {
      toast({ title: "Erro", description: "Você precisa estar logado para se promover.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    const db = getFirestore();
    
    try {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: user.displayName || user.name || "Admin Initial",
        email: user.email,
        globalRole: role,
        active: true,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      }, { merge: true });

      toast({ 
        title: "Sucesso!", 
        description: `Seu usuário agora é ${role === 'admin_2tech' ? 'Administrador' : 'Implantador'}. Recarregue a página.` 
      });
    } catch (e) {
      console.error(e);
      toast({ title: "Erro", description: "Não foi possível atualizar o cargo no Firestore.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return <div className="p-8">Verificando autenticação...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-none shadow-2xl">
        <CardHeader className="text-center">
          <div className="bg-orange-100 text-orange-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl font-bold">Configuração de Privilégios</CardTitle>
          <p className="text-slate-500 text-sm">Utilize esta página apenas para configurar seu primeiro acesso administrativo.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {!user ? (
            <div className="text-center space-y-4">
              <p className="text-red-500 font-medium">Você não está autenticado.</p>
              <Button asChild className="w-full">
                <Link href="/login">Ir para Login</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-100 p-4 rounded-lg">
                <p className="text-xs text-slate-400 uppercase font-bold">Logado como:</p>
                <p className="font-bold text-slate-700">{user.email}</p>
                <p className="text-xs text-slate-500">UID: {user.uid}</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <Button 
                  onClick={() => promoteToAdmin('admin_2tech')} 
                  disabled={isProcessing}
                  className="h-12 bg-primary font-bold"
                >
                  <UserCheck className="w-4 h-4 mr-2" /> Tornar-me Admin 2tech
                </Button>
                <Button 
                  onClick={() => promoteToAdmin('implantador')} 
                  disabled={isProcessing}
                  variant="outline"
                  className="h-12 font-bold"
                >
                  <UserCheck className="w-4 h-4 mr-2" /> Tornar-me Implantador
                </Button>
              </div>

              <Button asChild variant="ghost" className="w-full">
                <Link href="/"><ArrowLeft className="w-4 h-4 mr-2" /> Voltar para Home</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
