
"use client";

import { useState, useEffect } from "react";
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  updateDoc, 
  doc, 
  getDoc,
  getDocs
} from "firebase/firestore";
import { useUser } from "@/firebase";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Copy, Check, Users, ShieldCheck, Mail, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";

export default function ParticipantsPage() {
  const { user } = useUser();
  const db = getFirestore();
  const { toast } = useToast();
  
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState("");
  const [companyName, setCompanyName] = useState("");

  // Form State
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.implementationId) return;

    const q = query(
      collection(db, "implementationMembers"), 
      where("implementationId", "==", user.implementationId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Erro ao carregar membros:", error);
      setLoading(false);
    });

    const fetchCompanyName = async () => {
      if (user?.companyId) {
        const docRef = doc(db, "companies", user.companyId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setCompanyName(docSnap.data().name);
      }
    };
    fetchCompanyName();

    return () => unsubscribe();
  }, [user, db]);

  const handleCreateInvite = async () => {
    if (!newName || !newEmail || selectedAreas.length === 0) {
      toast({ title: "Erro", description: "Preencha todos os campos e selecione ao menos uma área.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const token = Math.random().toString(36).substring(2, 15);
    
    try {
      // 1. Create Invite Document
      const inviteRef = await addDoc(collection(db, "invites"), {
        token,
        implementationId: user?.implementationId,
        companyId: user?.companyId,
        companyName: companyName,
        name: newName,
        email: newEmail,
        areas: selectedAreas,
        clientAccessType: "participant",
        status: "pending",
        createdByUid: user?.uid,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
      });

      // 2. Pre-create Member Record
      // IMPORTANTE: clientAccessType é obrigatório pelas regras de segurança
      await addDoc(collection(db, "implementationMembers"), {
        implementationId: user?.implementationId,
        companyId: user?.companyId,
        name: newName,
        email: newEmail,
        role: "participant",
        clientAccessType: "participant",
        areas: selectedAreas,
        inviteStatus: "pending",
        inviteId: inviteRef.id,
        inviteToken: token, 
        active: true,
        createdAt: serverTimestamp()
      });

      toast({ title: "Convite Criado", description: "Copie o link e envie para o participante." });
      setNewName("");
      setNewEmail("");
      setSelectedAreas([]);
    } catch (e: any) {
      console.error("Erro ao criar convite:", e);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao criar convite. Verifique se você tem permissão de Cliente Master." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyInviteLink = async (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    
    let copied = false;

    // Tentar Clipboard API moderna
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(link);
        copied = true;
      }
    } catch (err) {
      console.warn("Clipboard API falhou, tentando fallback...", err);
    }

    // Fallback: execCommand('copy')
    if (!copied) {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = link;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) copied = true;
      } catch (err) {
        console.error("Fallback de cópia falhou:", err);
      }
    }

    if (copied) {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(""), 2000);
      toast({ title: "Link Copiado" });
    } else {
      toast({ 
        variant: "destructive", 
        title: "Erro ao copiar", 
        description: "Copie manualmente: " + link 
      });
    }
  };

  const deactivateMember = async (member: any) => {
    try {
      // Se for pendente, cancela o convite também
      if (member.inviteStatus === 'pending' && member.inviteId) {
        await updateDoc(doc(db, "invites", member.inviteId), {
          status: "canceled",
          updatedAt: serverTimestamp()
        });
      }

      await updateDoc(doc(db, "implementationMembers", member.id), {
        active: false,
        updatedAt: serverTimestamp()
      });

      toast({ title: "Participante desativado" });
    } catch (e) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível desativar." });
    }
  };

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  const activeMembers = members.filter(m => m.active);

  return (
    <AuthGuard allowedRoles={['client_master', 'admin_2tech']}>
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-headline font-bold text-slate-900 flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" /> Equipe da Empresa
            </h1>
            <p className="text-slate-500">Gerencie quem participa da jornada e quais áreas podem acessar.</p>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button><UserPlus className="w-5 h-5 mr-2" /> Novo Participante</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Convidar Participante</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input placeholder="Nome Completo" value={newName} onChange={e => setNewName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>E-mail Corporativo</Label>
                  <Input placeholder="email@empresa.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Áreas de Acesso Liberadas</Label>
                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-lg border">
                    {['cadastros', 'operacional', 'financeiro', 'relatorios', 'gestao'].map(area => (
                      <div key={area} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`new-${area}`} 
                          checked={selectedAreas.includes(area)}
                          onCheckedChange={(checked) => {
                            if(checked) setSelectedAreas([...selectedAreas, area]);
                            else setSelectedAreas(selectedAreas.filter(a => a !== area));
                          }}
                        />
                        <Label htmlFor={`new-${area}`} className="capitalize text-xs cursor-pointer">{area}</Label>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 italic mt-1">O participante verá apenas módulos das áreas selecionadas.</p>
                </div>
              </div>
              <DialogFooter>
                <Button className="w-full" onClick={handleCreateInvite} disabled={isSubmitting}>
                  {isSubmitting ? "Criando..." : "Gerar Link de Convite"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeMembers.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white rounded-2xl border-dashed border-2">
              <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500">Nenhum participante ativo. Convide sua equipe!</p>
            </div>
          ) : (
            activeMembers.map(member => (
              <Card key={member.id} className="border-none shadow-md hover:shadow-lg transition-all">
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {member.name?.substring(0,2).toUpperCase() || '??'}
                      </div>
                      <div>
                        <CardTitle className="text-sm">{member.name}</CardTitle>
                        <p className="text-[10px] text-slate-400">{member.email}</p>
                      </div>
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover Participante?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Iso irá desativar o acesso de <strong>{member.name}</strong> à jornada. Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deactivateMember(member)}>Remover</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1 min-h-[24px]">
                    {member.areas?.map((a: string) => (
                      <Badge key={a} variant="secondary" className="text-[9px] bg-blue-50 text-blue-700">{a}</Badge>
                    ))}
                  </div>
                  <Badge variant={member.inviteStatus === 'accepted' ? 'default' : 'outline'} className="w-full justify-center text-[10px] h-6">
                    {member.inviteStatus === 'accepted' ? 'Ativo na Jornada' : 'Aguardando Ativação'}
                  </Badge>
                </CardContent>
                {member.inviteStatus === 'pending' && (
                  <div className="p-4 bg-slate-50 border-t rounded-b-xl">
                     <Button variant="outline" size="sm" className="w-full text-xs font-bold" onClick={() => copyInviteLink(member.inviteToken)}>
                       {copiedToken === member.inviteToken ? <Check className="w-3 h-3 mr-2" /> : <Copy className="w-3 h-3 mr-2" />}
                       Copiar Link de Convite
                     </Button>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
