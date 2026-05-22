
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  getFirestore, doc, onSnapshot, collection, query, where, 
  setDoc, addDoc, getDocs, orderBy, serverTimestamp, updateDoc 
} from "firebase/firestore";
import { useUser } from "@/firebase";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, FileText, ShieldCheck, Users, Clock, 
  CheckCircle2, Calendar, MessageSquare, Info, AlertTriangle, ExternalLink, Search, User, Trash2, Check, X, ShieldAlert
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { UserNav } from "@/components/layout/UserNav";
import { journeyPhases } from "@/data/journeyData";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useJourneyStore } from "@/hooks/useJourneyStore";

export default function ClientDetailPage() {
  const { id: implementationId } = useParams();
  const { user: currentUser } = useUser();
  const db = getFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const { reviewEvidence, approveMeeting, requestMeetingAdjustments } = useJourneyStore();

  // Estados de Autorização
  const [accessStatus, setAccessStatus] = useState<"loading" | "allowed" | "denied">("loading");

  // Estados de Dados
  const [implementation, setImplementation] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [allModuleProgress, setAllModuleProgress] = useState<any[]>([]);
  const [allPhaseProgress, setAllPhaseProgress] = useState<any[]>([]);
  const [allMeetings, setAllMeetings] = useState<any[]>([]);
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [allNotes, setAllNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de UI e Modais
  const [isProcessing, setIsProcessing] = useState(false);
  const [reviewComment, setReviewComment] = useState("");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [activeModal, setActiveModal] = useState<'evidence' | 'meeting' | 'participant' | 'none'>( 'none');
  const [newNote, setNewNote] = useState("");
  const [noteVisibility, setNoteVisibility] = useState<'internal' | 'client_visible'>('internal');

  // 1. Carregar Implementação e Validar Acesso Primeiro
  useEffect(() => {
    if (!implementationId) return;

    const unsubImpl = onSnapshot(doc(db, "implementations", implementationId as string), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setImplementation({ id: snap.id, ...data });

        // Validação de acesso
        const isAdmin = currentUser?.globalRole === 'admin_2tech';
        const isAssigned = data.assignedImplantadorUid === currentUser?.uid;

        if (isAdmin || isAssigned) {
          setAccessStatus("allowed");
          
          if (data.companyId) {
            getDocs(query(collection(db, "companies"), where("id", "==", data.companyId))).then(cSnap => {
              if (!cSnap.empty) setCompany(cSnap.docs[0].data());
            });
          }
        } else {
          setAccessStatus("denied");
          setLoading(false);
        }
      } else {
        router.push("/implantador");
      }
    });

    return () => unsubImpl();
  }, [implementationId, db, currentUser, router]);

  // 2. Carregar o restante dos dados somente se permitido
  useEffect(() => {
    if (accessStatus !== "allowed" || !implementationId) return;

    const unsubMembers = onSnapshot(query(collection(db, "implementationMembers"), where("implementationId", "==", implementationId)), (snap) => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubModules = onSnapshot(query(collection(db, "moduleProgress"), where("implementationId", "==", implementationId)), (snap) => {
      setAllModuleProgress(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubPhases = onSnapshot(query(collection(db, "phaseProgress"), where("implementationId", "==", implementationId)), (snap) => {
      setAllPhaseProgress(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubMeetings = onSnapshot(query(collection(db, "meetings"), where("implementationId", "==", implementationId)), (snap) => {
      setAllMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubSubmissions = onSnapshot(query(collection(db, "quizSubmissions"), where("implementationId", "==", implementationId)), (snap) => {
      setAllSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubNotes = onSnapshot(query(collection(db, "implantadorNotes"), where("implementationId", "==", implementationId), orderBy("createdAt", "desc")), (snap) => {
      setAllNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => {
      unsubMembers(); unsubModules(); unsubPhases(); unsubMeetings(); unsubSubmissions(); unsubNotes();
    };
  }, [accessStatus, implementationId, db]);

  const canOperate = accessStatus === 'allowed';

  // Ações de Evidência
  const handleReviewEvidence = async (status: 'approved' | 'adjustment_requested' | 'rejected') => {
    if (!selectedItem || (status !== 'approved' && !reviewComment)) {
      toast({ title: "Feedback Obrigatório", description: "Informe o motivo do ajuste ou rejeição.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      await reviewEvidence({
        uid: selectedItem.uid,
        implId: implementationId as string,
        moduleId: selectedItem.moduleId,
        status,
        comment: reviewComment
      });
      toast({ title: "Revisão concluída", description: `Evidência marcada como ${status}` });
      setActiveModal('none');
      setReviewComment("");
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao salvar revisão" });
    } finally {
      setIsProcessing(false);
    }
  };

  // Ações de Encontro
  const handleMeetingAction = async (action: 'approve' | 'adjust' | 'realized') => {
    if (!selectedItem || (action === 'adjust' && !reviewComment)) {
      toast({ title: "Feedback Obrigatório", description: "Explique o ajuste necessário.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      if (action === 'realized') {
        const meetRef = doc(db, "meetings", selectedItem.id);
        const phaseRef = doc(db, "phaseProgress", `${implementationId}_${selectedItem.uid}_${selectedItem.phaseId}`);
        await updateDoc(meetRef, { status: "WaitingApproval", readyForApprovalAt: serverTimestamp(), updatedAt: serverTimestamp() });
        await setDoc(phaseRef, { status: "WaitingApproval", updatedAt: serverTimestamp() }, { merge: true });
        toast({ title: "Status Atualizado", description: "Encontro marcado como realizado." });
      } else if (action === 'approve') {
        await approveMeeting({
          uid: selectedItem.uid,
          implId: implementationId as string,
          compId: implementation.companyId,
          phaseId: selectedItem.phaseId,
          comment: reviewComment
        });
        toast({ title: "Encontro Aprovado", description: "Fase concluída e próxima etapa liberada." });
      } else {
        await requestMeetingAdjustments({
          uid: selectedItem.uid,
          implId: implementationId as string,
          compId: implementation.companyId,
          phaseId: selectedItem.phaseId,
          comment: reviewComment
        });
        toast({ title: "Ajuste Solicitado" });
      }
      setActiveModal('none');
      setReviewComment("");
    } catch (e) {
      toast({ variant: "destructive", title: "Erro na operação" });
    } finally {
      setIsProcessing(false);
    }
  };

  // Ações de Participante
  const toggleParticipant = async (member: any) => {
    if (member.role === 'implementation_master') {
      toast({ title: "Acesso Negado", description: "Não é possível desativar o Cliente Master.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      await updateDoc(doc(db, "implementationMembers", member.id), {
        active: !member.active,
        updatedAt: serverTimestamp()
      });
      toast({ title: member.active ? "Participante Desativado" : "Participante Reativado" });
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao atualizar" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setIsProcessing(true);
    try {
      await addDoc(collection(db, "implantadorNotes"), {
        implementationId,
        companyId: implementation?.companyId,
        createdByUid: currentUser?.uid,
        createdByName: currentUser?.name || "Especialista",
        note: newNote,
        visibility: noteVisibility,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setNewNote("");
      toast({ title: "Nota adicionada" });
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao salvar nota" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (accessStatus === "loading") return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <Clock className="w-12 h-12 text-primary animate-pulse" />
        <p className="text-slate-500 font-medium">Verificando autorização...</p>
      </div>
    </div>
  );

  if (accessStatus === "denied") return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="max-w-md w-full text-center py-12 border-none shadow-xl">
        <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <CardHeader>
          <CardTitle>Acesso não permitido</CardTitle>
        </CardHeader>
        <CardContent className="text-slate-500">
          Esta implantação não está vinculada ao seu usuário de implantador.
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button asChild variant="outline">
            <Link href="/implantador"><ArrowLeft className="w-4 h-4 mr-2" /> Voltar para o painel</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );

  const stats = {
    pendingEvidence: allModuleProgress.filter(p => p.evidenceStatus === 'submitted').length,
    pendingMeetings: allMeetings.filter(m => m.status === 'WaitingApproval').length,
    activeParticipants: members.filter(m => m.active).length
  };

  return (
    <AuthGuard allowedRoles={['implantador', 'admin_2tech']}>
      <div className="min-h-screen bg-slate-50 pb-20">
        <nav className="bg-slate-900 text-white py-4 px-8 flex justify-between items-center sticky top-0 z-30 shadow-md">
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="icon" asChild className="text-white hover:bg-white/10">
              <Link href="/implantador"><ArrowLeft className="w-5 h-5" /></Link>
            </Button>
            <div>
              <h1 className="font-bold text-lg leading-none">{company?.name || "Empresa Cliente"}</h1>
              <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mt-1">Gestão de Implantação</p>
            </div>
          </div>
          <UserNav user={currentUser} />
        </nav>

        <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
          <header className="bg-white p-8 rounded-3xl shadow-sm border flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <div className="space-y-1">
                <h2 className="text-3xl font-headline font-bold text-slate-900">Painel de Controle</h2>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-slate-50 border-slate-200">Ref: {implementation?.id?.substring(0,8)}</Badge>
                  <Badge className="bg-green-600">Individualizado</Badge>
                  <Badge variant="secondary" className="capitalize">{implementation?.status?.replace('_', ' ')}</Badge>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full lg:w-auto">
              <Card className="bg-blue-50/50 border-blue-100 p-4 text-center">
                <p className="text-[10px] font-bold text-blue-400 uppercase">Aguardando Avaliação</p>
                <p className="text-2xl font-bold text-blue-700">{stats.pendingMeetings}</p>
              </Card>
              <Card className="bg-orange-50/50 border-orange-100 p-4 text-center">
                <p className="text-[10px] font-bold text-orange-400 uppercase">Evidências Pendentes</p>
                <p className="text-2xl font-bold text-orange-700">{stats.pendingEvidence}</p>
              </Card>
              <Card className="bg-slate-50 border-slate-200 p-4 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Participantes</p>
                <p className="text-2xl font-bold text-slate-700">{stats.activeParticipants}</p>
              </Card>
            </div>
          </header>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-white border p-1 h-14 rounded-2xl shadow-sm overflow-x-auto justify-start max-w-full">
              <TabsTrigger value="overview" className="px-6 h-12 rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-white">Visão Geral</TabsTrigger>
              <TabsTrigger value="team" className="px-6 h-12 rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-white">Participantes</TabsTrigger>
              <TabsTrigger value="evidence" className="px-6 h-12 rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-white relative">
                Evidências
                {stats.pendingEvidence > 0 && <Badge className="absolute -top-1 -right-1 bg-red-500 text-white w-4 h-4 p-0 flex items-center justify-center rounded-full text-[8px]">{stats.pendingEvidence}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="meetings" className="px-6 h-12 rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-white relative">
                Encontros
                {stats.pendingMeetings > 0 && <Badge className="absolute -top-1 -right-1 bg-red-500 text-white w-4 h-4 p-0 flex items-center justify-center rounded-full text-[8px]">{stats.pendingMeetings}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="checkpoints" className="px-6 h-12 rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-white">Checkpoints</TabsTrigger>
              <TabsTrigger value="notes" className="px-6 h-12 rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-white">Observações</TabsTrigger>
            </TabsList>

            {/* ABA: VISÃO GERAL */}
            <TabsContent value="overview" className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {journeyPhases.map(phase => {
                  const pStatus = allPhaseProgress.filter(p => p.phaseId === phase.id);
                  const completed = pStatus.filter(p => p.status === 'Completed').length;
                  const inProgress = pStatus.filter(p => p.status === 'InProgress' || p.status === 'WaitingCheckpoint').length;
                  const waitingMeet = pStatus.filter(p => p.status === 'ReadyToSchedule' || p.status === 'Scheduled' || p.status === 'WaitingApproval').length;

                  return (
                    <Card key={phase.id} className="border-none shadow-sm hover:shadow-md transition-all">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-slate-800">{phase.order}. {phase.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="p-2 bg-green-50 rounded-lg">
                            <p className="text-[10px] text-green-600 font-bold uppercase">Concluídos</p>
                            <p className="text-lg font-bold text-green-700">{completed}</p>
                          </div>
                          <div className="p-2 bg-blue-50 rounded-lg">
                            <p className="text-[10px] text-blue-600 font-bold uppercase">Em Trilha</p>
                            <p className="text-lg font-bold text-blue-700">{inProgress}</p>
                          </div>
                          <div className="p-2 bg-orange-50 rounded-lg">
                            <p className="text-[10px] text-orange-600 font-bold uppercase">Validando</p>
                            <p className="text-lg font-bold text-green-700">{waitingMeet}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* ABA: PARTICIPANTES */}
            <TabsContent value="team">
              <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800">Membros da Implantação</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50/50 text-slate-400 font-bold uppercase text-[10px]">
                        <th className="px-6 py-4 text-left">Participante</th>
                        <th className="px-6 py-4 text-left">Papel / Áreas</th>
                        <th className="px-6 py-4 text-left">Status Geral</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {members.map(member => (
                        <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs",
                                member.active ? "bg-primary/10 text-primary" : "bg-slate-200 text-slate-400"
                              )}>
                                {member.name.substring(0,2).toUpperCase()}
                              </div>
                              <div>
                                <p className={cn("font-bold", member.active ? "text-slate-700" : "text-slate-400")}>{member.name}</p>
                                <p className="text-[10px] text-slate-400">{member.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <Badge variant="outline" className="w-fit text-[9px] uppercase font-bold text-slate-500">{member.clientAccessType || 'participante'}</Badge>
                              <div className="flex flex-wrap gap-1">
                                {member.areas?.map((a: string) => (
                                  <span key={a} className="text-[8px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded uppercase font-bold">{a}</span>
                                ))}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={member.active ? 'default' : 'secondary'} className={cn(
                              "text-[10px]",
                              member.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"
                            )}>
                              {member.active ? "Ativo" : "Desativado"}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {canOperate && member.role !== 'implementation_master' && (
                              <Button 
                                variant={member.active ? "ghost" : "outline"} 
                                size="sm" 
                                className={cn(member.active ? "text-red-500 hover:text-red-700 hover:bg-red-50" : "text-green-600")}
                                onClick={() => toggleParticipant(member)}
                                disabled={isProcessing}
                              >
                                {member.active ? <Trash2 className="w-4 h-4" /> : "Reativar"}
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* ABA: EVIDÊNCIAS */}
            <TabsContent value="evidence">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allModuleProgress.filter(p => p.evidenceStatus).length === 0 ? (
                  <Card className="col-span-full py-20 text-center border-dashed border-2">
                    <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500">Nenhuma evidência enviada até o momento.</p>
                  </Card>
                ) : (
                  allModuleProgress.filter(p => p.evidenceStatus).map(ev => {
                    const member = members.find(m => m.uid === ev.uid);
                    return (
                      <Card key={ev.id} className={cn(
                        "border-none shadow-sm overflow-hidden bg-white border-l-4",
                        ev.evidenceStatus === 'submitted' ? "border-l-orange-400" :
                        ev.evidenceStatus === 'approved' ? "border-l-green-400" : "border-l-red-400"
                      )}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                             <div>
                               <p className="text-[10px] font-bold text-slate-400 uppercase">{ev.phaseId} / {ev.moduleId}</p>
                               <CardTitle className="text-sm font-bold mt-1">{member?.name || 'Membro'}</CardTitle>
                             </div>
                             <Badge variant={ev.evidenceStatus === 'approved' ? 'default' : 'secondary'} className="text-[9px]">
                               {ev.evidenceStatus === 'submitted' ? 'Enviada' : 
                                ev.evidenceStatus === 'approved' ? 'Aprovada' :
                                ev.evidenceStatus === 'adjustment_requested' ? 'Ajuste Solicitado' : 'Rejeitada'}
                             </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="bg-slate-50 p-3 rounded-lg flex items-center gap-3 border">
                            <FileText className="w-5 h-5 text-slate-400" />
                            <div className="flex-1 overflow-hidden">
                              <p className="text-xs font-bold text-slate-700 truncate">{ev.fileName}</p>
                              <p className="text-[9px] text-slate-400">Em {ev.updatedAt?.toDate() ? format(ev.updatedAt.toDate(), "dd/MM/yy HH:mm", { locale: ptBR }) : '...'}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><ExternalLink className="w-4 h-4" /></Button>
                          </div>
                          
                          {ev.reviewComment && (
                             <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase">Parecer do Implantador:</Label>
                                <div className="text-xs italic text-slate-600 bg-slate-100 p-2 rounded">"{ev.reviewComment}"</div>
                             </div>
                          )}
                        </CardContent>
                        {canOperate && ev.evidenceStatus === 'submitted' && (
                          <CardFooter className="bg-slate-50 py-3 border-t grid grid-cols-2 gap-2">
                            <Button variant="outline" size="sm" className="text-[10px] font-bold" onClick={() => { setSelectedItem(ev); setActiveModal('evidence'); }}>Solicitar Ajuste</Button>
                            <Button size="sm" className="text-[10px] font-bold bg-green-600 hover:bg-green-700" onClick={() => { setSelectedItem(ev); handleReviewEvidence('approved'); }}>Aprovar Arquivo</Button>
                          </CardFooter>
                        )}
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>

            {/* ABA: ENCONTROS */}
            <TabsContent value="meetings">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {allMeetings.length === 0 ? (
                  <Card className="col-span-full py-20 text-center border-dashed border-2">
                    <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500">Nenhum encontro registrado até o momento.</p>
                  </Card>
                ) : (
                  allMeetings.map(meet => {
                    const member = members.find(m => m.uid === meet.uid);
                    const isWaiting = meet.status === 'WaitingApproval';
                    const isScheduled = meet.status === 'Scheduled';

                    return (
                      <Card key={meet.id} className={cn(
                        "border-none shadow-md overflow-hidden bg-white border-l-4",
                        meet.status === 'Completed' ? "border-l-green-500" :
                        meet.status === 'PendingAdjustments' ? "border-l-red-500" : "border-l-blue-500"
                      )}>
                        <div className="p-6 space-y-6">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                                <Calendar className="w-6 h-6" />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900">{member?.name || 'Participante'}</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{meet.phaseId}</p>
                              </div>
                            </div>
                            <Badge variant={meet.status === 'Completed' ? "default" : "secondary"} className="text-[10px]">
                              {meet.status}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-3 rounded-xl border">
                              <p className="text-[9px] font-bold text-slate-400 uppercase">Data Agendada</p>
                              <p className="text-sm font-bold text-slate-700">{meet.scheduledDate}</p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-xl border">
                              <p className="text-[9px] font-bold text-slate-400 uppercase">Horário</p>
                              <p className="text-sm font-bold text-slate-700">{meet.scheduledTime}</p>
                            </div>
                          </div>

                          {isScheduled && canOperate && (
                             <Button variant="outline" className="w-full text-blue-600 font-bold" onClick={() => { setSelectedItem(meet); handleMeetingAction('realized'); }}>
                               Marcar como Realizado
                             </Button>
                          )}

                          {isWaiting && canOperate && (
                            <div className="space-y-4 pt-2 border-t">
                              <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500">Parecer Final do Especialista</Label>
                                <Textarea 
                                  placeholder="Detalhe o resultado do encontro ou solicite ajustes..." 
                                  className="text-xs min-h-[80px] bg-slate-50/50"
                                  value={reviewComment}
                                  onChange={(e) => setReviewComment(e.target.value)}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <Button 
                                  variant="outline" 
                                  className="text-red-600 border-red-200 hover:bg-red-50 font-bold"
                                  onClick={() => { setSelectedItem(meet); handleMeetingAction('adjust'); }}
                                  disabled={isProcessing}
                                >
                                  Solicitar Ajuste
                                </Button>
                                <Button 
                                  className="bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg shadow-green-100"
                                  onClick={() => { setSelectedItem(meet); handleMeetingAction('approve'); }}
                                  disabled={isProcessing}
                                >
                                  Aprovar Etapa
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          {meet.reviewComment && (
                             <div className="bg-slate-50 p-4 rounded-xl border">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Feedback de Revisão:</p>
                                <p className="text-xs text-slate-700 italic">"{meet.reviewComment}"</p>
                             </div>
                          )}
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>

            {/* ABA: CHECKPOINTS */}
            <TabsContent value="checkpoints">
              <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                {allSubmissions.length === 0 ? (
                  <div className="p-20 text-center text-slate-500">
                    <CheckCircle2 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p>Nenhum checkpoint respondido nesta implantação.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="px-6 py-4 text-left">Usuário</th>
                          <th className="px-6 py-4 text-left">Fase</th>
                          <th className="px-6 py-4 text-left">Score</th>
                          <th className="px-6 py-4 text-left">Data</th>
                          <th className="px-6 py-4 text-right">Respostas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {allSubmissions.map(sub => {
                          const member = members.find(m => m.uid === sub.uid);
                          return (
                            <tr key={sub.id}>
                              <td className="px-6 py-4 font-bold text-slate-700">{member?.name || 'Membro'}</td>
                              <td className="px-6 py-4 uppercase text-[10px] font-bold text-slate-500">{sub.phaseId}</td>
                              <td className="px-6 py-4">
                                <Badge className={sub.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                                  {sub.score}%
                                </Badge>
                              </td>
                              <td className="px-6 py-4 text-slate-500 text-xs">
                                {sub.submittedAt?.toDate() ? format(sub.submittedAt.toDate(), "dd/MM/yy HH:mm", { locale: ptBR }) : '...'}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <Dialog>
                                  <DialogTrigger asChild><Button variant="ghost" size="sm">Ver Detalhes</Button></DialogTrigger>
                                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                    <DialogHeader><DialogTitle>Respostas de: {member?.name}</DialogTitle></DialogHeader>
                                    <div className="space-y-4 py-4">
                                      {Object.entries(sub.answers || {}).map(([qId, ans]: any) => (
                                        <div key={qId} className="p-4 bg-slate-50 rounded-lg border">
                                          <p className="text-xs font-bold text-slate-400 uppercase mb-2">ID Questão: {qId}</p>
                                          <p className="text-sm font-medium text-slate-800">{ans}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ABA: OBSERVAÇÕES */}
            <TabsContent value="notes" className="space-y-6">
              <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg">Registrar Nova Observação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea 
                    placeholder="Adicione um comentário importante sobre esta implantação..."
                    className="min-h-[100px]"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                  />
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex gap-4">
                       <label className="flex items-center gap-2 cursor-pointer">
                         <input type="radio" checked={noteVisibility === 'internal'} onChange={() => setNoteVisibility('internal')} />
                         <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Interna (2tech)</span>
                       </label>
                       <label className="flex items-center gap-2 cursor-pointer">
                         <input type="radio" checked={noteVisibility === 'client_visible'} onChange={() => setNoteVisibility('client_visible')} />
                         <span className="text-xs font-bold text-blue-600 uppercase tracking-tighter">Pública (Cliente)</span>
                       </label>
                    </div>
                    <Button onClick={handleAddNote} disabled={isProcessing || !newNote.trim()}>
                      {isProcessing ? "Salvando..." : "Registrar Nota"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                {allNotes.length === 0 ? (
                  <p className="text-center py-10 text-slate-400 text-sm">Nenhuma observação registrada.</p>
                ) : (
                  allNotes.map(note => (
                    <Card key={note.id} className={cn(
                      "border-none shadow-sm",
                      note.visibility === 'internal' ? "bg-slate-50" : "bg-blue-50/30 border border-blue-100"
                    )}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <User className="w-3 h-3 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-500 uppercase">{note.createdByName}</span>
                            <Badge variant="outline" className={cn(
                              "text-[8px] uppercase",
                              note.visibility === 'internal' ? "text-slate-400" : "text-blue-500 border-blue-200"
                            )}>
                              {note.visibility === 'internal' ? "Interna" : "Pública"}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {note.createdAt?.toDate() ? format(note.createdAt.toDate(), "dd/MM HH:mm", { locale: ptBR }) : '...'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed">{note.note}</p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </main>

        {/* Modal Genérico para Feedback de Ajustes */}
        <Dialog open={activeModal === 'evidence'} onOpenChange={(open) => !open && setActiveModal('none')}>
          <DialogContent>
            <DialogHeader><DialogTitle>Solicitar Ajuste na Evidência</DialogTitle></DialogHeader>
            <div className="py-4 space-y-4">
               <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 flex gap-3">
                 <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
                 <p className="text-xs text-orange-800">O cliente será notificado que este arquivo precisa de alterações.</p>
               </div>
               <div className="space-y-2">
                 <Label>O que precisa ser corrigido? (Obrigatório)</Label>
                 <Textarea 
                   placeholder="Descreva aqui o erro ou o que falta no print enviado..."
                   value={reviewComment}
                   onChange={(e) => setReviewComment(e.target.value)}
                 />
               </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActiveModal('none')}>Cancelar</Button>
              <Button disabled={isProcessing || !reviewComment.trim()} onClick={() => handleReviewEvidence('adjustment_requested')}>Confirmar Solicitação</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
