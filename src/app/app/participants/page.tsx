
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
  deleteDoc, 
  doc, 
  getDoc 
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
import { UserPlus, Copy, Check, Users, ShieldCheck, Mail, Trash2, Loader2 } from "lucide-react";
import { AuthGuard } from "@/components/auth/AuthGuard";

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
      toast({ title: "Erro", description: "Preencha todos os campos.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const token = Math.random().toString(36).substring(2, 15);
    
    try {
      // 1. Create Invite Document
      await addDoc(collection(db, "invites"), {
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
      await addDoc(collection(db, "implementationMembers"), {
        implementationId: user?.implementationId,
        companyId: user?.companyId,
        name: newName,
        email: newEmail,
        role: "participant",
        areas: selectedAreas,
        inviteStatus: "pending",
        inviteToken: token, 
        active: true,
        createdAt: serverTimestamp()
      });

      toast({ title: "Convite Criado" });
      setNewName("");
      setNewEmail("");
      setSelectedAreas([]);
    } catch (e) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao criar convite." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(""), 2000);
    toast({ title: "Link Copiado" });
  };

  const removeMember = async (id: string) => {
    try {
      await deleteDoc(doc(db, "implementationMembers", id));
      toast({ title: "Removido" });
    } catch (e) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível remover." });
    }
  };

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <AuthGuard allowedRoles={['client_master', 'admin_2tech']}>
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-headline font-bold text-slate-900 flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" /> Participantes
            </h1>
            <p className="text-slate-500">Gerencie a equipe da sua empresa na jornada.</p>
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
                  <Label>E-mail</Label>
                  <Input placeholder="email@empresa.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Áreas de Acesso</Label>
                  <div className="grid grid-cols-2 gap-2">
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
                        <Label htmlFor={`new-${area}`} className="capitalize text-xs">{area}</Label>
                      </div>
                    ))}
                  </div>
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
          {members.map(member => (
            <Card key={member.id} className="border-none shadow-md">
              <CardHeader className="pb-2">
                <div className="flex justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {member.name.substring(0,2).toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-sm">{member.name}</CardTitle>
                      <p className="text-[10px] text-slate-400">{member.email}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-500" onClick={() => removeMember(member.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1">
                  {member.areas.map((a: string) => (
                    <Badge key={a} variant="secondary" className="text-[9px]">{a}</Badge>
                  ))}
                </div>
                <Badge variant={member.inviteStatus === 'accepted' ? 'default' : 'outline'} className="w-full justify-center">
                  {member.inviteStatus === 'accepted' ? 'Ativo' : 'Pendente'}
                </Badge>
              </CardContent>
              {member.inviteStatus === 'pending' && (
                <div className="p-4 bg-slate-50 border-t">
                   <Button variant="outline" size="sm" className="w-full" onClick={() => copyInviteLink(member.inviteToken)}>
                     {copiedToken === member.inviteToken ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                     Copiar Link
                   </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </AuthGuard>
  );
}
