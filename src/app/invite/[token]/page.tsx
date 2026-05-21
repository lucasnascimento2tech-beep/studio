"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, query, where, getDocs, doc, setDoc, updateDoc, serverTimestamp, getFirestore, getDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, AlertTriangle, UserPlus, LogIn, Loader2 } from "lucide-react";
import { useUser } from "@/firebase";

export default function InvitePage() {
  const { token } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user: currentUser } = useUser();
  const db = getFirestore();
  const auth = getAuth();

  const [isMounted, setIsMounted] = useState(false);
  const [invite, setInvite] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<'create' | 'existing'>('create');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    async function fetchInvite() {
      if (!token) return;
      
      try {
        const q = query(collection(db, "invites"), where("token", "==", token));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setInvite("invalid");
          setLoading(false);
          return;
        }

        const inviteData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        
        const now = new Date();
        if (inviteData.status === 'accepted') setInvite("accepted");
        else if (inviteData.status === 'canceled') setInvite("canceled");
        else if (inviteData.expiresAt && new Date(inviteData.expiresAt) < now) setInvite("expired");
        else {
          setInvite(inviteData);
          if (inviteData.companyId) {
            const compSnap = await getDoc(doc(db, "companies", inviteData.companyId));
            if (compSnap.exists()) setCompany(compSnap.data());
          }
        }
      } catch (err) {
        console.error("Error fetching invite:", err);
        setInvite("invalid");
      } finally {
        setLoading(false);
      }
    }
    
    if (isMounted) {
      fetchInvite();
    }
  }, [token, db, isMounted]);

  const finalizeInvitation = async (uid: string, email: string) => {
    await setDoc(doc(db, "users", uid), {
      uid: uid,
      name: invite.name,
      email: email,
      globalRole: invite.clientAccessType === "master" ? "client_master" : "client_participant",
      companyId: invite.companyId,
      implementationId: invite.implementationId,
      active: true,
      updatedAt: serverTimestamp()
    }, { merge: true });

    const memberQ = query(
      collection(db, "implementationMembers"), 
      where("implementationId", "==", invite.implementationId),
      where("email", "==", email)
    );
    const memberSnapshot = await getDocs(memberQ);
    if (!memberSnapshot.empty) {
      await updateDoc(doc(db, "implementationMembers", memberSnapshot.docs[0].id), {
        uid: uid,
        inviteStatus: "accepted",
        acceptedAt: serverTimestamp()
      });
    }

    await updateDoc(doc(db, "invites", invite.id), {
      status: "accepted",
      acceptedByUid: uid,
      acceptedAt: serverTimestamp()
    });
  };

  const handleAcceptNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, invite.email, password);
      await finalizeInvitation(user.uid, invite.email);
      toast({ title: "Conta criada!", description: "Sua jornada começa agora." });
      router.push("/");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao criar conta", description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptExisting = async () => {
    if (!currentUser) {
      toast({ title: "Login Necessário", description: "Faça login com sua conta existente para vincular o acesso." });
      router.push("/login?redirect=" + window.location.pathname);
      return;
    }

    if (currentUser.email !== invite.email) {
      toast({ 
        variant: "destructive", 
        title: "E-mail Divergente", 
        description: `Este convite é para ${invite.email}, mas você está logado como ${currentUser.email}.` 
      });
      return;
    }

    setSubmitting(true);
    try {
      await finalizeInvitation(currentUser.uid, invite.email);
      toast({ title: "Acesso Vinculado!", description: "Você já pode acessar a jornada." });
      router.push("/");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao vincular", description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isMounted || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const StatusCard = ({ icon, title, desc, color }: any) => (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="max-w-md w-full text-center py-12 border-none shadow-xl">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${color}`}>
          {icon}
        </div>
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        <p className="text-slate-500 mt-2 px-6">{desc}</p>
        <Button asChild className="mt-8" variant="outline">
          <a href="/login">Ir para o Login</a>
        </Button>
      </Card>
    </div>
  );

  if (invite === "invalid") return <StatusCard icon={<AlertTriangle className="text-red-600" />} title="Convite não encontrado" desc="O link que você acessou parece estar incorreto ou não existe." color="bg-red-100" />;
  if (invite === "accepted") return <StatusCard icon={<CheckCircle2 className="text-green-600" />} title="Convite já aceito" desc="Este convite já foi utilizado para criar ou vincular uma conta." color="bg-green-100" />;
  if (invite === "canceled") return <StatusCard icon={<AlertTriangle className="text-orange-600" />} title="Convite cancelado" desc="Este acesso foi revogado pelo administrador." color="bg-orange-100" />;
  if (invite === "expired") return <StatusCard icon={<AlertTriangle className="text-slate-600" />} title="Convite expirado" desc="Este link expirou por tempo. Solicite um novo ao responsável." color="bg-slate-100" />;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-12">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="bg-primary text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg ring-4 ring-blue-100">
            <UserPlus className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-headline font-bold text-slate-900">Convite de Participação</h1>
          <p className="text-slate-500 mt-2">Sua empresa convidou você para a jornada de implantação.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="border-none shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">Detalhes do Acesso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-xs text-slate-400 uppercase">Empresa</Label>
                <p className="font-bold text-slate-800 text-lg">{company?.name || "Buscando empresa..."}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-400 uppercase">Seu Papel</Label>
                <p className="font-medium text-primary capitalize">{invite?.clientAccessType === "master" ? "Cliente Master" : "Participante"}</p>
              </div>
              <div>
                <Label className="text-xs text-slate-400 uppercase">Áreas Liberadas</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {invite?.areas?.map((a: string) => (
                    <Badge key={a} variant="secondary" className="bg-blue-50 text-blue-700">{a}</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg overflow-hidden">
            <Tabs defaultValue="create" className="w-full" onValueChange={(v) => setMode(v as any)}>
              <CardHeader className="p-0">
                <TabsList className="grid w-full grid-cols-2 rounded-none h-12">
                  <TabsTrigger value="create" className="text-xs h-full">Nova Conta</TabsTrigger>
                  <TabsTrigger value="existing" className="text-xs h-full">Já tenho acesso</TabsTrigger>
                </TabsList>
              </CardHeader>

              <TabsContent value="create" className="mt-0">
                <form onSubmit={handleAcceptNew}>
                  <CardContent className="space-y-4 pt-6">
                    <div className="space-y-2">
                      <Label>Seu E-mail</Label>
                      <Input value={invite?.email || ""} disabled className="bg-slate-50" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pass">Crie uma Senha</Label>
                      <Input id="pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="conf">Confirme a Senha</Label>
                      <Input id="conf" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" className="w-full font-bold h-12" disabled={submitting}>
                      {submitting ? "Criando..." : "Ativar meu Acesso"}
                    </Button>
                  </CardFooter>
                </form>
              </TabsContent>

              <TabsContent value="existing" className="mt-0">
                <CardContent className="space-y-6 pt-6 text-center">
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <p className="text-sm text-blue-800 leading-relaxed">
                      Se você já possui uma conta no 2tech com o e-mail <strong>{invite?.email}</strong>, basta vincular este novo acesso à sua conta atual.
                    </p>
                  </div>
                  {currentUser && currentUser.email === invite?.email ? (
                    <Button onClick={handleAcceptExisting} className="w-full h-12 font-bold" disabled={submitting}>
                      {submitting ? "Vinculando..." : "Vincular a esta conta"}
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => router.push("/login?redirect=" + window.location.pathname)} className="w-full h-12 font-bold">
                      <LogIn className="w-4 h-4 mr-2" /> Fazer Login Primeiro
                    </Button>
                  )}
                </CardContent>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  );
}
