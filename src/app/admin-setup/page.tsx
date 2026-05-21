
"use client";

import { useState } from "react";
import { getFirestore, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { useUser } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, UserCheck, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";

export default function AdminSetupPage() {
  const { user, loading } = useUser();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Campos para criação manual se não estiver logado
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const promoteExistingUser = async (role: 'admin_2tech' | 'implantador') => {
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
        description: `Seu usuário agora é ${role === 'admin_2tech' ? 'Administrador' : 'Implantador'}.` 
      });
    } catch (e) {
      console.error(e);
      toast({ title: "Erro", description: "Não foi possível atualizar o cargo no Firestore. Verifique suas Security Rules.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const createAndPromote = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    const auth = getAuth();
    const db = getFirestore();

    try {
      // 1. Criar no Auth
      const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
      
      // 2. Criar no Firestore como Admin
      await setDoc(doc(db, "users", newUser.uid), {
        uid: newUser.uid,
        name: name,
        email: email,
        globalRole: "admin_2tech",
        active: true,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      toast({ title: "Conta Criada!", description: "Seu primeiro administrador foi configurado com sucesso." });
    } catch (error: any) {
      console.error(error);
      toast({ 
        title: "Erro ao criar", 
        description: error.code === 'auth/email-already-in-use' ? "Este e-mail já existe. Tente logar e usar o botão acima." : error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Lado A: Promover Logado */}
        <Card className="border-none shadow-xl">
          <CardHeader className="text-center">
            <div className="bg-orange-100 text-orange-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserCheck className="w-6 h-6" />
            </div>
            <CardTitle>Usuário Atual</CardTitle>
            <p className="text-slate-500 text-sm">Promova sua conta atual logada.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {!user ? (
              <div className="text-center py-8 space-y-4">
                <p className="text-slate-400 italic">Nenhum usuário logado no momento.</p>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/login">Ir para Login</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-100 p-4 rounded-lg">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Logado como:</p>
                  <p className="font-bold text-slate-700">{user.email}</p>
                  <p className="text-[10px] text-slate-500 truncate">UID: {user.uid}</p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <Button onClick={() => promoteExistingUser('admin_2tech')} disabled={isProcessing} className="bg-primary h-12">
                    <ShieldAlert className="w-4 h-4 mr-2" /> Tornar-me Admin
                  </Button>
                  <Button onClick={() => promoteExistingUser('implantador')} disabled={isProcessing} variant="outline" className="h-12">
                    <UserCheck className="w-4 h-4 mr-2" /> Tornar-me Implantador
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
             <Button asChild variant="ghost" className="w-full">
                <Link href="/"><ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Início</Link>
              </Button>
          </CardFooter>
        </Card>

        {/* Lado B: Criar Novo Admin (Para o primeiro acesso) */}
        <Card className="border-none shadow-xl bg-slate-900 text-white">
          <CardHeader className="text-center">
            <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <CardTitle>Criar Novo Admin</CardTitle>
            <p className="text-slate-400 text-sm">Use isso se você ainda não tem conta.</p>
          </CardHeader>
          <form onSubmit={createAndPromote}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white">Nome</Label>
                <Input 
                  className="bg-white/10 border-white/20 text-white" 
                  placeholder="Seu Nome" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">E-mail</Label>
                <Input 
                  type="email"
                  className="bg-white/10 border-white/20 text-white" 
                  placeholder="admin@empresa.com" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Senha</Label>
                <Input 
                  type="password"
                  className="bg-white/10 border-white/20 text-white" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isProcessing} className="w-full bg-blue-600 hover:bg-blue-700 h-12 font-bold">
                {isProcessing ? "Processando..." : "Criar e Tornar Admin"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
