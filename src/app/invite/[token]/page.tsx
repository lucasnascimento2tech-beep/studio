
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, query, where, getDocs, doc, setDoc, updateDoc, serverTimestamp, getFirestore } from "firebase/firestore";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, AlertTriangle, UserPlus, Shield } from "lucide-react";

export default function InvitePage() {
  const { token } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const db = getFirestore();
  const auth = getAuth();

  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchInvite() {
      if (!token) return;
      
      const q = query(collection(db, "invites"), where("token", "==", token), where("status", "==", "pending"));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setInvite("invalid");
      } else {
        setInvite({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      }
      setLoading(false);
    }
    fetchInvite();
  }, [token, db]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create Auth User
      const { user } = await createUserWithEmailAndPassword(auth, invite.email, password);

      // 2. Create User Profile
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: invite.name,
        email: invite.email,
        globalRole: invite.clientAccessType === "master" ? "client_master" : "client_participant",
        companyId: invite.companyId,
        implementationId: invite.implementationId,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // 3. Update Implementation Member
      const memberQ = query(
        collection(db, "implementationMembers"), 
        where("implementationId", "==", invite.implementationId),
        where("email", "==", invite.email)
      );
      const memberSnapshot = await getDocs(memberQ);
      if (!memberSnapshot.empty) {
        await updateDoc(doc(db, "implementationMembers", memberSnapshot.docs[0].id), {
          uid: user.uid,
          inviteStatus: "accepted",
          acceptedAt: serverTimestamp()
        });
      }

      // 4. Update Invite
      await updateDoc(doc(db, "invites", invite.id), {
        status: "accepted",
        acceptedByUid: user.uid,
        acceptedAt: serverTimestamp()
      });

      toast({ title: "Conta criada!", description: "Sua jornada começa agora." });
      router.push("/");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao criar conta", description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando convite...</div>;

  if (invite === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full text-center py-12">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900">Convite Inválido</h2>
          <p className="text-slate-500 mt-2 px-6">Este convite expirou, foi cancelado ou já foi utilizado.</p>
          <Button asChild className="mt-8" variant="outline">
            <a href="/login">Ir para o Login</a>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-12">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="bg-blue-600 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg ring-4 ring-blue-100">
            <UserPlus className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-headline font-bold text-slate-900">Convite de Participação</h1>
          <p className="text-slate-500 mt-2">Você foi convidado para a implantação na 2tech</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Detalhes do Acesso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-xs text-slate-400 uppercase">Empresa</Label>
                <p className="font-bold text-slate-800 text-lg">Cliente Exemplo Promotora</p>
              </div>
              <div>
                <Label className="text-xs text-slate-400 uppercase">Seu Papel</Label>
                <p className="font-medium text-blue-700">{invite.clientAccessType === "master" ? "Cliente Master" : "Participante"}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-400 uppercase">Áreas Liberadas</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {invite.areas.map((a: string) => (
                    <Badge key={a} variant="secondary" className="bg-blue-50 text-blue-700">{a}</Badge>
                  ))}
                </div>
              </div>
              {invite.requiredForMeetings?.length > 0 && (
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                  <p className="text-xs font-bold text-orange-800 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Participação Obrigatória
                  </p>
                  <ul className="text-xs text-orange-700 mt-1 list-disc list-inside">
                    {invite.requiredForMeetings.map((m: string) => <li key={m}>{m.replace('_', ' ')}</li>)}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Crie sua Senha</CardTitle>
            </CardHeader>
            <form onSubmit={handleAccept}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Seu E-mail</Label>
                  <Input value={invite.email} disabled className="bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pass">Nova Senha</Label>
                  <Input 
                    id="pass" 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="conf">Confirmar Senha</Label>
                  <Input 
                    id="conf" 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    required 
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full font-bold" disabled={submitting}>
                  {submitting ? "Criando Conta..." : "Ativar meu Acesso"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
