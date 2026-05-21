
"use client";

import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { LogOut, Clock, ShieldAlert, XCircle, ArrowLeft, Loader2 } from "lucide-react";
import { signOut, getAuth } from "firebase/auth";
import { useEffect, useState } from "react";
import { getFirestore, collection, query, where, onSnapshot } from "firebase/firestore";
import Link from "next/link";

export default function PendingApprovalPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    if (user.approvalStatus === 'approved') {
      router.push("/");
      return;
    }

    const db = getFirestore();
    const q = query(collection(db, "accessRequests"), where("uid", "==", user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setRequest(snapshot.docs[0].data());
      }
      setLoading(false);
    }, (err) => {
      console.error("Erro ao buscar solicitação:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, userLoading, router]);

  const handleLogout = () => {
    signOut(getAuth());
    router.push("/login");
  };

  if (userLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const isRejected = user?.approvalStatus === 'rejected' || request?.status === 'rejected';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card className="border-none shadow-xl overflow-hidden">
          <div className={`h-2 w-full ${isRejected ? 'bg-red-500' : 'bg-orange-500'}`} />
          <CardHeader className="text-center pb-2">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isRejected ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
              {isRejected ? <XCircle className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">
              {isRejected ? "Solicitação Rejeitada" : "Aguardando Aprovação"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 py-6 text-center">
            <div className="space-y-1">
              <p className="text-sm text-slate-400 uppercase font-bold tracking-widest">Usuário</p>
              <p className="font-bold text-slate-800 text-lg">{user?.name || "..."}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm text-slate-400 uppercase font-bold tracking-widest">Empresa Informada</p>
              <p className="font-medium text-slate-700">{request?.companyName || "Não informada"}</p>
            </div>

            <div className={`p-4 rounded-xl border ${isRejected ? 'bg-red-50 border-red-100 text-red-800' : 'bg-blue-50 border-blue-100 text-blue-800'}`}>
              <p className="text-sm leading-relaxed">
                {isRejected 
                  ? "Sua solicitação foi analisada, mas não foi aprovada. Entre em contato com o responsável pela implantação ou com a equipe 2tech." 
                  : "Sua solicitação de acesso foi enviada. A equipe responsável pela implantação irá validar seus dados antes de liberar o acesso à jornada."}
              </p>
            </div>

            {request?.reviewComment && (
              <div className="text-left bg-slate-100 p-4 rounded-lg border border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Motivo / Comentário:</p>
                <p className="text-sm italic text-slate-600">"{request.reviewComment}"</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3 bg-slate-50 border-t py-6">
            <Button variant="outline" className="w-full h-12" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" /> Sair da Conta
            </Button>
            <Button variant="ghost" className="w-full text-slate-500" asChild>
              <Link href="/login"><ArrowLeft className="w-4 h-4 mr-2" /> Voltar para o Login</Link>
            </Button>
          </CardFooter>
        </Card>
        
        <p className="text-center mt-8 text-xs text-slate-400 flex items-center justify-center gap-2">
          <ShieldAlert className="w-4 h-4" /> Suporte: atendimento@2tech.com.br
        </p>
      </div>
    </div>
  );
}
