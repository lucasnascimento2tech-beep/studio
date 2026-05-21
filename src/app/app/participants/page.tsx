
"use client";

import { useState, useEffect } from "react";
import { getFirestore, collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/firebase/auth/use-user";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Copy, Check, Users, ShieldCheck, Mail } from "lucide-react";

export default function ParticipantsPage() {
  const { user } = useAuth();
  const db = getFirestore();
  const { toast } = useToast();
  
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState("");

  // Form State
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [isMandatory, setIsMandatory] = useState(false);
  const [mandatoryMeetings, setMandatoryMeetings] = useState<string[]>([]);

  useEffect(() => {
    async function fetchMembers() {
      if (!user?.implementationId) return;
      const q = query(collection(db, "implementationMembers"), where("implementationId", "==", user.implementationId));
      const snapshot = await getDocs(q);
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }
    fetchMembers();
  }, [user, db]);

  const handleCreateInvite = async () => {
    if (!newName || !newEmail || selectedAreas.length === 0) {
      toast({ title: "Erro", description: "Preencha os campos obrigatórios.", variant: "destructive" });
      return;
    }

    const token = Math.random().toString(36).substring(2, 15);
    
    try {
      // 1. Create Invite
      const inviteRef = await addDoc(collection(db, "invites"), {
        token,
        implementationId: user.implementationId,
        companyId: user.companyId,
        name: newName,
        email: newEmail,
        areas: selectedAreas,
        clientAccessType: "participant",
        isRequiredParticipant: isMandatory,
        requiredForMeetings: mandatoryMeetings,
        status: "pending",
        createdByUid: user.uid,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
      });

      // 2. Create Member Record
      await addDoc(collection(db, "implementationMembers"), {
        implementationId: user.implementationId,
        companyId: user.companyId,
        name: newName,
        email: newEmail,
        role: "participant",
        areas: selectedAreas,
        isRequiredParticipant: isMandatory,
        requiredForMeetings: mandatoryMeetings,
        inviteStatus: "pending",
        active: true,
        createdAt: serverTimestamp()
      });

      toast({ title: "Convite Criado", description: "Copie o link e envie para o participante." });
      
      // Reset form
      setNewName("");
      setNewEmail("");
      setSelectedAreas([]);
      setIsMandatory(false);
      setMandatoryMeetings([]);
      
      // Refresh list
      window.location.reload();
    } catch (e) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível criar o convite." });
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(""), 2000);
    toast({ title: "Copiado!", description: "Link de convite pronto para envio." });
  };

  if (loading) return <div className="p-8">Carregando participantes...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-slate-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" /> Equipe da Implantação
          </h1>
          <p className="text-slate-500">Gerencie quem participa e quais áreas cada pessoa acessa.</p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 font-bold h-12">
              <UserPlus className="w-5 h-5 mr-2" /> Adicionar Participante
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Novo Participante</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input placeholder="Ex: Maria Silva" value={newName} onChange={e => setNewName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>E-mail Corporativo</Label>
                  <Input placeholder="maria@empresa.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase text-slate-400">Áreas de Acesso</Label>
                <div className="grid grid-cols-2 gap-3">
                  {['cadastros', 'operacional', 'financeiro', 'relatorios', 'gestao'].map(area => (
                    <div key={area} className="flex items-center space-x-2">
                      <Checkbox 
                        id={area} 
                        checked={selectedAreas.includes(area)}
                        onCheckedChange={(checked) => {
                          if(checked) setSelectedAreas([...selectedAreas, area]);
                          else setSelectedAreas(selectedAreas.filter(a => a !== area));
                        }}
                      />
                      <Label htmlFor={area} className="capitalize">{area}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox id="mandatory" checked={isMandatory} onCheckedChange={(c) => setIsMandatory(!!c)} />
                  <Label htmlFor="mandatory" className="font-bold">Participante Obrigatório</Label>
                </div>
                
                {isMandatory && (
                  <div className="space-y-3 pl-6 border-l-2 border-primary/20">
                    <Label className="text-[10px] font-bold uppercase text-slate-400">Encontros em que é essencial:</Label>
                    {['meeting_1_parametrizacao', 'meeting_2_operacao', 'meeting_3_financeiro'].map(meeting => (
                      <div key={meeting} className="flex items-center space-x-2">
                        <Checkbox 
                          id={meeting}
                          checked={mandatoryMeetings.includes(meeting)}
                          onCheckedChange={(c) => {
                            if(c) setMandatoryMeetings([...mandatoryMeetings, meeting]);
                            else setMandatoryMeetings(mandatoryMeetings.filter(m => m !== meeting));
                          }}
                        />
                        <Label htmlFor={meeting} className="text-xs capitalize">{meeting.replace(/_/g, ' ')}</Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button className="w-full h-12" onClick={handleCreateInvite}>Gerar Convite</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map(member => (
          <Card key={member.id} className="border-none shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-primary font-bold text-lg">
                  {member.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <CardTitle className="text-base font-bold">{member.name}</CardTitle>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {member.email}
                  </p>
                </div>
              </div>
              <Badge variant={member.inviteStatus === 'accepted' ? 'default' : 'outline'} className={member.inviteStatus === 'accepted' ? 'bg-green-600' : 'text-orange-500 border-orange-200'}>
                {member.inviteStatus === 'accepted' ? 'Ativo' : 'Pendente'}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {member.areas.map((area: string) => (
                  <Badge key={area} variant="secondary" className="text-[10px] bg-slate-100 text-slate-600">{area}</Badge>
                ))}
              </div>
              
              {member.isRequiredParticipant && (
                <div className="bg-blue-50/50 p-2 rounded border border-blue-100 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-[10px] font-bold text-blue-800">Participante Estratégico</span>
                </div>
              )}
            </CardContent>
            {member.inviteStatus === 'pending' && (
              <div className="p-4 border-t bg-slate-50 rounded-b-lg">
                 <Button variant="outline" size="sm" className="w-full text-primary font-bold bg-white" onClick={() => copyInviteLink(member.id)}>
                   {copiedToken === member.id ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                   Copiar Link de Convite
                 </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
