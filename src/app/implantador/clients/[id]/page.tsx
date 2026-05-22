"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
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
  CheckCircle2, Calendar, MessageSquare, Info, AlertTriangle, ExternalLink, Search, User, Trash2, Check, X, ShieldAlert, BarChart3, ChevronDown, ChevronRight, RefreshCw
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { UserNav } from "@/components/layout/UserNav";
import { journeyPhases } from "@/data/journeyData";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useJourneyStore } from "@/hooks/useJourneyStore";
import { canAccessModule } from "@/utils/permissions";

export default function ClientDetailPage() {
  const { id: implementationId } = useParams();
  const { user: currentUser } = useUser();
  const db = getFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const { approveModuleReview, requestModuleAdjustments, rejectModuleReview, approveMeeting, requestMeetingAdjustments, recalculatePhaseAfterModuleReview } = useJourneyStore();

  // Estados de Autorização
  const [accessStatus, setAccessStatus] = useState<"loading" | "allowed" | "denied">("loading");

  // Estados de Dados
  const [implementation, setImplementation] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [allModuleProgress, setAllModuleProgress] = useState<any[]>([]);
  const [allPhaseProgress, setAllPhaseProgress] = useState<any[]>([]);
  const [allMeetings, setAllMeetings] = useState<any[]>([]);
  const [allNotes, setAllNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de UI e Modais
  const [isProcessing, setIsProcessing] = useState(false);
  const [reviewComment, setReviewComment] = useState("");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [activeModal, setActiveModal] = useState<'module_review' | 'meeting' | 'none'>( 'none');
  const [moduleActionType, setModuleActionType] = useState<'approve' | 'adjust' | 'reject' | null>(null);
  const [newNote, setNewNote] = useState("");
  const [noteVisibility, setNoteVisibility] = useState<'internal' | 'client_visible'>('internal');
  
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Record<string, boolean>>({});
  const [hasSyncedOnce, setHasSyncedProgress] = useState(false);

  // 1. Carregar Implementação e Validar Acesso Primeiro
  useEffect(() => {
    if (!implementationId) return;

    const unsubImpl = onSnapshot(doc(db, "implementations", implementationId as string), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setImplementation({ id: snap.id, ...data });

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

    const unsubNotes = onSnapshot(query(collection(db, "implantadorNotes"), where("implementationId", "==", implementationId)), (snap) => {
      const notes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      notes.sort((a: any, b: any) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });
      setAllNotes(notes);
      setLoading(false);
    });

    return () => {
      unsubMembers(); unsubModules(); unsubPhases(); unsubMeetings(); unsubNotes();
    };
  }, [accessStatus, implementationId, db]);

  const canOperate = accessStatus === 'allowed';

  // Sincronização manual de progresso
  const handleSyncProgress = useCallback(async () => {
    if (!implementationId || members.length === 0) return;
    setIsProcessing(true);
    try {
      for (const member of members) {
        if (!member.uid || !member.active) continue;
        for (const phase of journeyPhases) {
          await recalculatePhaseAfterModuleReview({
            uid: member.uid,
            implId: implementationId as string,
            compId: implementation.companyId,
            phaseId: phase.id
          });
        }
      }
      toast({ title: "Sincronização concluída", description: "O progresso dos usuários foi reprocessado." });
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao sincronizar" });
    } finally {
      setIsProcessing(false);
    }
  }, [implementationId, members, implementation?.companyId, recalculatePhaseAfterModuleReview, toast]);

  // Ações de Revisão de Módulo
  const handleModuleReview = async () => {
    if (!selectedItem || !moduleActionType) return;
    if (moduleActionType !== 'approve' && !reviewComment) {
      toast({ title: "Feedback Obrigatório", description: "Informe o motivo do ajuste ou rejeição.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      const params = {
        uid: selectedItem.uid,
        implId: implementationId as string,
        compId: implementation.companyId,
        phaseId: selectedItem.phaseId,
        moduleId: selectedItem.moduleId,
        comment: reviewComment
      };

      if (moduleActionType === 'approve') await approveModuleReview(params);
      else if (moduleActionType === 'adjust') await requestModuleAdjustments(params);
      else await rejectModuleReview(params);

      toast({ title: "Revisão concluída", description: "O status do módulo foi atualizado." });
      setActiveModal('none');
      setReviewComment("");
    } catch (e) {
      toast({ variant: "destructive", title: "Erro ao salvar revisão" });
    } finally {
      setIsProcessing(false);
    }
  };

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

  if (accessStatus === "loading") return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Clock className="w-12 h-12 text-primary animate-pulse" /></div>;

  const stats = {
    pendingReview: allModuleProgress.filter(p => p.moduleReviewStatus === 'pending_review').length,
    pendingMeetings: allMeetings.filter(m => m.status === 'WaitingApproval').length,
    activeParticipants: members.filter(m => m.active).length
  };

  const togglePhase = (memberUid: string, phaseId: string) => {
    const key = `${memberUid}_${phaseId}`;
    setExpandedPhases(prev => ({ ...prev, [key]: !prev[key] }));
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
          <div className="flex items-center gap-4">
             {currentUser?.globalRole === 'admin_2tech' && (
               <Button variant="outline" size="sm" asChild className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
                 <Link href="/admin"><ShieldCheck className="w-4 h-4 mr-2" /> Painel Admin</Link>
               </Button>
             )}
             <UserNav user={currentUser} />
          </div>
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
                  <Badge className="bg-green-600">Jornada Individualizada</Badge>
                  <Badge variant="secondary" className="capitalize">{implementation?.status?.replace('_', ' ')}</Badge>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full lg:w-auto">
              <Card className="bg-orange-50/50 border-orange-100 p-4 text-center">
                <p className="text-[9px] font-bold text-orange-400 uppercase">Aprovação Pendente</p>
                <p className="text-2xl font-bold text-orange-700">{stats.pendingReview}</p>
              </Card>
              <Card className="bg-blue-50/50 border-blue-100 p-4 text-center">
                <p className="text-[9px] font-bold text-blue-400 uppercase">Encontros</p>
                <p className="text-2xl font-bold text-blue-700">{stats.pendingMeetings}</p>
              </Card>
              <Card className="bg-slate-50 border-slate-200 p-4 text-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase">Equipe Ativa</p>
                <p className="text-2xl font-bold text-slate-700">{stats.activeParticipants}</p>
              </Card>
            </div>
          </header>

          <Tabs defaultValue="progress" className="space-y-6">
            <TabsList className="bg-white border p-1 h-14 rounded-2xl shadow-sm overflow-x-auto justify-start max-w-full">
              <TabsTrigger value="progress" className="px-6 h-12 rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4" /> Progresso e Validação
                {stats.pendingReview > 0 && <Badge className="ml-2 bg-red-500 text-white">{stats.pendingReview}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="team" className="px-6 h-12 rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-white">Participantes</TabsTrigger>
              <TabsTrigger value="meetings" className="px-6 h-12 rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-white relative">
                Encontros
                {stats.pendingMeetings > 0 && <Badge className="ml-2 bg-blue-500 text-white">{stats.pendingMeetings}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="notes" className="px-6 h-12 rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-white">Observações</TabsTrigger>
            </TabsList>

            {/* ABA: PROGRESSO E VALIDAÇÃO */}
            <TabsContent value="progress" className="space-y-6">
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={handleSyncProgress} disabled={isProcessing} className="text-[10px] font-bold uppercase tracking-wider">
                  <RefreshCw className={cn("w-3 h-3 mr-2", isProcessing && "animate-spin")} /> Sincronizar Fases
                </Button>
              </div>

              {members.filter(m => m.active && m.uid).map(member => {
                const userAreas = member.areas || [];
                const role = member.clientAccessType === 'master' ? 'client_master' : 'client_participant';
                
                const progressByPhase = journeyPhases.map(phase => {
                  const accessible = phase.modules.filter(m => canAccessModule(role, userAreas, m));
                  const approvedCount = accessible.filter(m => {
                    const p = allModuleProgress.find(ap => ap.uid === member.uid && ap.moduleId === m.id);
                    if (!p) return false;
                    return p.moduleReviewStatus === 'approved' || (m.requiresEvidence && p.evidenceStatus === 'approved');
                  }).length;
                  
                  const dbStatus = allPhaseProgress.find(p => p.uid === member.uid && p.phaseId === phase.id)?.status;
                  return { phase, accessible, approvedCount, status: dbStatus || (phase.id === 'fase-0' ? 'InProgress' : 'Locked') };
                }).filter(p => p.accessible.length > 0);

                const totalAcc = progressByPhase.reduce((acc, curr) => acc + curr.accessible.length, 0);
                const totalAppr = progressByPhase.reduce((acc, curr) => acc + curr.approvedCount, 0);
                const globalPercent = totalAcc > 0 ? Math.round((totalAppr / totalAcc) * 100) : 0;

                const isExpanded = expandedMember === member.uid;

                return (
                  <Card key={member.uid} className="border-none shadow-sm overflow-hidden">
                    <div className="p-6 cursor-pointer hover:bg-slate-50 transition-colors flex flex-col md:flex-row justify-between items-center gap-6" onClick={() => setExpandedMember(isExpanded ? null : member.uid!)}>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">{member.name.substring(0,2).toUpperCase()}</div>
                        <div>
                          <h4 className="font-bold text-slate-900">{member.name}</h4>
                          <p className="text-xs text-slate-400 capitalize">{member.areas.join(', ')}</p>
                        </div>
                      </div>
                      <div className="flex-1 max-w-md w-full px-6">
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-1">
                          <span>Módulos Validados</span>
                          <span>{globalPercent}% ({totalAppr}/{totalAcc})</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${globalPercent}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-300" /> : <ChevronRight className="w-5 h-5 text-slate-300" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t bg-slate-50/50 p-6 space-y-4">
                        {progressByPhase.map(p => {
                          const phaseKey = `${member.uid}_${p.phase.id}`;
                          const isPhaseOpen = expandedPhases[phaseKey] || p.status === 'InProgress' || p.status === 'WaitingModuleApproval' || p.status === 'PendingAdjustments';

                          return (
                            <div key={p.phase.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                              <div 
                                className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50"
                                onClick={() => togglePhase(member.uid!, p.phase.id)}
                              >
                                <div className="flex items-center gap-3">
                                  {isPhaseOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-widest">{p.phase.title}</h5>
                                  <Badge variant="outline" className={cn(
                                    "text-[9px] uppercase",
                                    p.status === 'Completed' ? "bg-green-50 text-green-700" :
                                    p.status === 'ReadyToSchedule' ? "bg-blue-50 text-blue-700" :
                                    p.status === 'PendingAdjustments' ? "bg-red-50 text-red-700" : "bg-white"
                                  )}>
                                    {p.status === 'WaitingModuleApproval' ? 'Aguardando Aprovação' : 
                                     p.status === 'InProgress' ? 'Em Andamento' :
                                     p.status === 'ReadyToSchedule' ? 'Encontro Liberado' :
                                     p.status === 'Completed' ? 'Concluída' : p.status}
                                  </Badge>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400">{p.approvedCount}/{p.accessible.length} validados</span>
                              </div>

                              {isPhaseOpen && (
                                <div className="p-4 border-t bg-slate-50/30 space-y-3">
                                  {p.accessible.map(mod => {
                                    const prog = allModuleProgress.find(mp => mp.uid === member.uid && mp.moduleId === mod.id);
                                    const reviewStatus = prog?.moduleReviewStatus || (mod.requiresEvidence && prog?.evidenceStatus === 'approved' ? 'approved' : null);
                                    
                                    return (
                                      <div key={mod.id} className={cn(
                                        "p-4 rounded-xl border bg-white shadow-sm flex flex-col md:flex-row justify-between gap-4",
                                        reviewStatus === 'approved' ? "border-green-100" : reviewStatus === 'adjustment_requested' ? "border-red-100" : "border-slate-100"
                                      )}>
                                        <div className="flex-1 space-y-2">
                                          <div className="flex items-center gap-2">
                                            <p className="text-xs font-bold text-slate-800">{mod.title}</p>
                                            <Badge variant="secondary" className="text-[8px] uppercase">{mod.area}</Badge>
                                            {mod.isRequired && <span className="text-[8px] text-red-500 font-bold uppercase tracking-tighter">Obrigatório</span>}
                                          </div>
                                          
                                          {prog?.validationAnswer && (
                                            <div className="bg-slate-50 p-3 rounded-lg border text-xs">
                                              <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Resposta de Validação:</p>
                                              <p className="text-slate-700 italic">"{prog.validationAnswer}"</p>
                                            </div>
                                          )}
                                          
                                          {prog?.fileName && (
                                            <div className="flex items-center gap-2 text-primary font-bold text-xs bg-blue-50 w-fit px-3 py-1.5 rounded-lg border border-blue-100">
                                              <FileText className="w-3 h-3" /> {prog.fileName}
                                              <Button variant="ghost" size="icon" className="h-5 w-5 ml-2"><ExternalLink className="w-3 h-3" /></Button>
                                            </div>
                                          )}
                                          
                                          {prog?.reviewComment && (
                                            <p className="text-[10px] text-slate-500 font-medium bg-slate-50 p-2 rounded">Parecer: {prog.reviewComment}</p>
                                          )}
                                        </div>

                                        <div className="flex flex-col justify-center gap-2 min-w-[150px]">
                                          {reviewStatus === 'approved' ? (
                                            <Badge className="bg-green-100 text-green-700 h-8 flex justify-center gap-2 border-green-200"><CheckCircle2 className="w-3 h-3" /> Validado</Badge>
                                          ) : reviewStatus === 'adjustment_requested' ? (
                                            <Badge className="bg-red-100 text-red-700 h-8 flex justify-center gap-2 border-red-200"><AlertTriangle className="w-3 h-3" /> Ajuste solicitado</Badge>
                                          ) : prog?.status === 'completed' ? (
                                            <div className="grid grid-cols-2 gap-2">
                                              <Button size="sm" variant="outline" className="text-red-500 h-8 text-[10px]" onClick={() => { setSelectedItem(prog); setModuleActionType('adjust'); setActiveModal('module_review'); }}>Ajuste</Button>
                                              <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8 text-[10px]" onClick={() => { approveModuleReview({ uid: member.uid!, implId: implementationId as string, compId: implementation.companyId, phaseId: p.phase.id, moduleId: mod.id }); }}>Aprovar</Button>
                                            </div>
                                          ) : (
                                            <Badge variant="outline" className="h-8 flex justify-center text-slate-400 border-dashed">Pendente Cliente</Badge>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                );
              })}
            </TabsContent>

            {/* ABA: PARTICIPANTES */}
            <TabsContent value="team">
              <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-400 font-bold uppercase text-[10px]"><th className="px-6 py-4 text-left">Participante</th><th className="px-6 py-4 text-left">Áreas</th><th className="px-6 py-4 text-left">Status</th><th className="px-6 py-4 text-right">Ações</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {members.map(member => (
                      <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 flex items-center gap-3">
                          <div className={cn("w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs", member.active ? "bg-primary/10 text-primary" : "bg-slate-200 text-slate-400")}>{member.name.substring(0,2).toUpperCase()}</div>
                          <div><p className={cn("font-bold", member.active ? "text-slate-700" : "text-slate-400")}>{member.name}</p><p className="text-[10px] text-slate-400">{member.email}</p></div>
                        </td>
                        <td className="px-6 py-4"><div className="flex flex-wrap gap-1">{member.areas?.map((a: string) => <span key={a} className="text-[8px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded uppercase font-bold">{a}</span>)}</div></td>
                        <td className="px-6 py-4"><Badge variant={member.active ? 'default' : 'secondary'} className={cn("text-[10px]", member.active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400")}>{member.active ? "Ativo" : "Desativado"}</Badge></td>
                        <td className="px-6 py-4 text-right">{canOperate && member.role !== 'implementation_master' && <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => {}}><Trash2 className="w-4 h-4" /></Button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* ABA: ENCONTROS */}
            <TabsContent value="meetings">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {allMeetings.length === 0 ? <Card className="col-span-full py-20 text-center border-dashed border-2"><Calendar className="w-12 h-12 text-slate-200 mx-auto mb-4" /><p className="text-slate-500">Nenhum encontro registrado.</p></Card> : 
                  allMeetings.map(meet => {
                    const member = members.find(m => m.uid === meet.uid);
                    return (
                      <Card key={meet.id} className={cn("border-none shadow-md overflow-hidden bg-white border-l-4", meet.status === 'Completed' ? "border-l-green-500" : meet.status === 'PendingAdjustments' ? "border-l-red-500" : "border-l-blue-500")}>
                        <div className="p-6 space-y-6">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600"><Calendar className="w-6 h-6" /></div>
                              <div><h4 className="font-bold text-slate-900">{member?.name || 'Participante'}</h4><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{meet.phaseId}</p></div>
                            </div>
                            <Badge variant={meet.status === 'Completed' ? "default" : "secondary"}>{meet.status}</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4"><div className="bg-slate-50 p-3 rounded-xl border text-sm font-bold text-slate-700">{meet.scheduledDate}</div><div className="bg-slate-50 p-3 rounded-xl border text-sm font-bold text-slate-700">{meet.scheduledTime}</div></div>
                          {meet.status === 'WaitingApproval' && canOperate && (
                            <div className="space-y-4 pt-2 border-t">
                              <Textarea placeholder="Parecer final do especialista..." className="text-xs" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />
                              <div className="grid grid-cols-2 gap-3">
                                <Button variant="outline" className="text-red-600 font-bold" onClick={() => { setSelectedItem(meet); handleMeetingAction('adjust'); }}>Solicitar Ajuste</Button>
                                <Button className="bg-green-600 font-bold" onClick={() => { setSelectedItem(meet); handleMeetingAction('approve'); }}>Aprovar Etapa</Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })
                }
              </div>
            </TabsContent>

            {/* ABA: OBSERVAÇÕES */}
            <TabsContent value="notes" className="space-y-6">
              <Card className="border-none shadow-sm overflow-hidden"><CardHeader><CardTitle className="text-lg">Registrar Nova Observação</CardTitle></CardHeader><CardContent className="space-y-4"><Textarea placeholder="Adicione um comentário interno ou público..." className="min-h-[100px]" value={newNote} onChange={(e) => setNewNote(e.target.value)}/><div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"><div className="flex gap-4"><label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={noteVisibility === 'internal'} onChange={() => setNoteVisibility('internal')} /><span className="text-xs font-bold text-slate-500 uppercase">Interna (2tech)</span></label><label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={noteVisibility === 'client_visible'} onChange={() => setNoteVisibility('client_visible')} /><span className="text-xs font-bold text-blue-600 uppercase">Pública (Cliente)</span></label></div><Button onClick={() => {}} disabled={isProcessing || !newNote.trim()}>Registrar Nota</Button></div></CardContent></Card>
            </TabsContent>
          </Tabs>
        </main>

        <Dialog open={activeModal === 'module_review'} onOpenChange={(open) => !open && setActiveModal('none')}>
          <DialogContent>
            <DialogHeader><DialogTitle>{moduleActionType === 'adjust' ? 'Solicitar Ajuste no Módulo' : 'Rejeitar Módulo'}</DialogTitle></DialogHeader>
            <div className="py-4 space-y-4">
               <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 flex gap-3"><AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" /><p className="text-xs text-orange-800">O cliente precisará reenviar este item para análise.</p></div>
               <div className="space-y-2"><Label>O que precisa ser corrigido pelo participante?</Label><Textarea placeholder="Explique o motivo do ajuste..." value={reviewComment} onChange={(e) => setReviewComment(e.target.value)}/></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setActiveModal('none')}>Cancelar</Button><Button disabled={isProcessing || !reviewComment.trim()} onClick={handleModuleReview}>Confirmar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
