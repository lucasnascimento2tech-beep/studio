
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
    });

    return () => unsubscribe();
  }, [user, userLoading, router]);

  const handleLogout = () => {
    signOut(getAuth());
    router.push("/login");
  };

  if (userLoading || loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  const isRejected = user?.approvalStatus === 'rejected' || request?.status === 'rejected';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <Card className="border-none shadow-xl">
          <CardHeader className="text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isRejected ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
              {isRejected ? <XCircle className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
            </div>
            <CardTitle className="text-2xl font-bold">
              {isRejected ? "Solicitação Rejeitada" : "Aguardando Aprovação"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="space-y-1">
              <p className="text-sm text-slate-400 uppercase font-bold">Usuário</p>
              <p className="font-bold text-slate-800 text-lg">{user?.name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-slate-400 uppercase font-bold">Empresa</p>
              <p className="font-medium text-slate-700">{request?.companyName || "Carregando..."}</p>
            </div>

            <div className={`p-4 rounded-xl border ${isRejected ? 'bg-red-50 border-red-100 text-red-800' : 'bg-blue-50 border-blue-100 text-blue-800'}`}>
              <p className="text-sm">
                {isRejected 
                  ? "Infelizmente sua solicitação não foi aprovada. Verifique os comentários abaixo ou entre em contato com o suporte." 
                  : "Sua solicitação está em análise. Você receberá um aviso assim que seu acesso for liberado."}
              </p>
            </div>

            {request?.reviewComment && (
              <div className="text-left bg-slate-100 p-4 rounded-lg border">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Motivo / Comentário:</p>
                <p className="text-sm italic text-slate-600">"{request.reviewComment}"</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3 bg-slate-50 py-6 border-t rounded-b-lg">
            <Button variant="outline" className="w-full" onClick={handleLogout}><LogOut className="w-4 h-4 mr-2" /> Sair da Conta</Button>
            <Button variant="ghost" className="w-full text-slate-500" asChild>
              <Link href="/login"><ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Login</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
