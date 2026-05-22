
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getFirestore, doc, onSnapshot, collection, query, where, updateDoc, serverTimestamp, getDoc, setDoc } from "firebase/firestore";
import { useUser } from "@/firebase";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, FileText, 
  ShieldCheck, ExternalLink, Users, Clock, CheckCircle2, Calendar, AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { UserNav } from "@/components/layout/UserNav";
import { journeyPhases } from "@/data/journeyData";

export default function ClientDetailSpecialistPage() {
  const { id: implementationId } = useParams();
  const { user } = useUser();
  const db = getFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [implementation, setImplementation] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [allModuleProgress, setAllModuleProgress] = useState<any[]>([]);
  const [allMeetings, setAllMeetings] = useState<any[]>([]);
  const [allPhaseProgress, setAllPhaseProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!implementationId) return;

    const unsubscribeImpl = onSnapshot(doc(db, "implementations", implementationId as string), (docSnap) => {
      if (docSnap.exists()) setImplementation({ id: docSnap.id, ...docSnap.data() });
      else router.push("/implantador");
    });

    const qMembers = query(collection(db, "implementationMembers"), where("implementationId", "==", implementationId));
    const unsubscribeMembers = onSnapshot(qMembers, (snap) => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qProg = query(collection(db, "moduleProgress"), where("implementationId", "==", implementationId));
    const unsubscribeProg = onSnapshot(qProg, (snap) => {
      setAllModuleProgress(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qPhases = query(collection(db, "phaseProgress"), where("implementationId", "==", implementationId));
    const unsubscribePhases = onSnapshot(qPhases, (snap) => {
      setAllPhaseProgress(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qMeetings = query(collection(db, "meetings"), where("implementationId", "==", implementationId));
    const unsubscribeMeetings = onSnapshot(qMeetings, (snap) => {
      setAllMeetings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => {
      unsubscribeImpl();
      unsubscribeMembers();
      unsubscribeProg();
      unsubscribePhases();
      unsubscribeMeetings();
    };
  }, [implementationId, db, router]);

  const handleApproveMeeting = async (meeting: any) => {
    setIsProcessing(true);
    const note = reviewNote[meeting.id] || "Encontro realizado e etapa aprovada.";
    
    try {
      // 1. Atualiza Meeting
      await updateDoc(doc(db, "meetings", meeting.id), {
        status: "Completed",
        implantadorComment: note,
        approvedAt: serverTimestamp(),
        approvedByUid: user?.uid
      });

      // 2. Atualiza PhaseProgress do usuário
      await updateDoc(doc(db, "phaseProgress", `${meeting.uid}_${meeting.phaseId}`), {
        status: "Completed",
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 3. Libera próxima fase individual
      const currentIndex = journeyPhases.findIndex(p => p.id === meeting.phaseId);
      const nextPhase = journeyPhases[currentIndex + 1];
      if (nextPhase) {
        await setDoc(doc(db, "phaseProgress", `${meeting.uid}_${nextPhase.id}`), {
          uid: meeting.uid,
          implementationId: meeting.implementationId,
          companyId: meeting.companyId,
          phaseId: nextPhase.id,
          status: "InProgress",
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      toast({ title: "Etapa Aprovada!", description: "O usuário já pode avançar na jornada." });
    } catch (e) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao processar aprovação." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestAdjustments = async (meeting: any) => {
    setIsProcessing(true);
    const note = reviewNote[meeting.id];
    if (!note) {
      toast({ title: "Comentário Necessário", description: "Explique o que precisa ser ajustado.", variant: "destructive" });
      setIsProcessing(false);
      return;
    }

    try {
      await updateDoc(doc(db, "meetings", meeting.id), {
        status: "PendingAdjustments",
        implantadorComment: note,
        updatedAt: serverTimestamp()
      });

      await updateDoc(doc(db, "phaseProgress", `${meeting.uid}_${meeting.phaseId}`), {
        status: "PendingAdjustments",
        updatedAt: serverTimestamp()
      });

      toast({ title: "Ajuste Solicitado", description: "O usuário foi notificado." });
    } catch (e) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao solicitar ajuste." });
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  const pendingMeetings = allMeetings.filter(m => m.status === 'Scheduled' || m.status === 'WaitingApproval');

  return (
    <AuthGuard allowedRoles={['implantador', 'admin_2tech']}>
      <div className="min-h-screen bg-slate-50 pb-20">
        <nav className="bg-slate-900 text-white py-4 px-8 flex justify-between items-center sticky top-0 z-30 shadow-md">
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="icon" asChild className="text-white hover:bg-white/10">
              <Link href="/implantador"><ArrowLeft className="w-5 h-5" /></Link>
            </Button>
            <div>
              <h1 className="font-bold text-lg leading-none">Gestão de Cliente</h1>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">Ref: {implementation?.id?.substring(0,8)}</p>
            </div>
          </div>
          <UserNav user={user} />
        </nav>

        <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
          <header className="bg-white p-8 rounded-3xl shadow-sm border flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-3xl font-headline font-bold text-slate-900">Dashboard do Cliente</h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge className="bg-blue-600">Gestão Individualizada</Badge>
                  <Badge variant="outline" className="border-primary text-primary font-bold">{implementation?.status?.replace('_', ' ')}</Badge>
                  <Badge variant="secondary" className="bg-slate-100 text-slate-500">{members.length} Participantes</Badge>
                </div>
              </div>
            </div>
          </header>

          <Tabs defaultValue="team" className="space-y-6">
            <TabsList className="bg-white border p-1 h-14 rounded-2xl shadow-sm">
              <TabsTrigger value="team" className="px-8 h-12 rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
                Equipe & Status Individual
              </TabsTrigger>
              <TabsTrigger value="meetings" className="px-8 h-12 rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
                Encontros p/ Validar ({pendingMeetings.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="team">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {members.map(member => {
                  const mPhases = allPhaseProgress.filter(p => p.uid === (member.uid || member.email));
                  const currentPhase = mPhases.find(p => p.status !== 'Completed' && p.status !== 'Locked') || { phaseId: 'Início', status: 'Início', progressPercent: 0 };
                  
                  return (
                    <Card key={member.id} className="border-none shadow-md overflow-hidden bg-white hover:shadow-lg transition-all">
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 border">
                            {member.name.substring(0,2).toUpperCase()}
                          </div>
                          <div>
                            <CardTitle className="text-sm font-bold">{member.name}</CardTitle>
                            <p className="text-[10px] text-slate-400">{member.email}</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-bold uppercase">Status Atual</span>
                          <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700">{currentPhase.status}</Badge>
                        </div>
                        <div className="space-y-1">
                           <p className="text-[10px] font-bold text-slate-500">FASE: {currentPhase.phaseId}</p>
                           <Progress value={currentPhase.progressPercent || 0} className="h-1.5" />
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {member.areas?.map((a: string) => (
                            <Badge key={a} variant="secondary" className="text-[9px] bg-slate-50 text-slate-500">{a}</Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="meetings">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {pendingMeetings.length === 0 ? (
                  <Card className="col-span-full py-20 text-center border-dashed border-2">
                    <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Nenhum encontro aguardando validação.</p>
                  </Card>
                ) : (
                  pendingMeetings.map(meet => {
                    const member = members.find(m => m.uid === meet.uid);
                    return (
                      <Card key={meet.id} className="border-none shadow-md overflow-hidden bg-white">
                        <div className="p-6 space-y-4">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                                <Calendar className="w-6 h-6" />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900">{member?.name || 'Membro'}</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{meet.phaseId}</p>
                              </div>
                            </div>
                            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none">Agendado: {meet.scheduledDate}</Badge>
                          </div>

                          <div className="bg-slate-50 p-4 rounded-xl space-y-2 border">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400 font-bold">HORÁRIO</span>
                              <span className="font-bold text-slate-700">{meet.scheduledTime}</span>
                            </div>
                            <div className="pt-2 border-t">
                              <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase">Observações do Cliente:</p>
                              <p className="text-xs italic text-slate-600">"{meet.notes || 'Nenhuma observação enviada.'}"</p>
                            </div>
                          </div>

                          <div className="space-y-3 pt-2">
                            <Label className="text-xs font-bold text-slate-500">Parecer do Implantador</Label>
                            <Textarea 
                              placeholder="Adicione um comentário ou detalhe o que precisa de ajuste..." 
                              className="text-xs min-h-[80px]"
                              value={reviewNote[meet.id] || ""}
                              onChange={(e) => setReviewNote({...reviewNote, [meet.id]: e.target.value})}
                            />
                            <div className="grid grid-cols-2 gap-3">
                              <Button 
                                variant="outline" 
                                className="text-red-600 border-red-200 hover:bg-red-50 font-bold h-10"
                                onClick={() => handleRequestAdjustments(meet)}
                                disabled={isProcessing}
                              >
                                Solicitar Ajuste
                              </Button>
                              <Button 
                                className="bg-green-600 hover:bg-green-700 text-white font-bold h-10 shadow-lg shadow-green-100"
                                onClick={() => handleApproveMeeting(meet)}
                                disabled={isProcessing}
                              >
                                Aprovar Etapa
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </AuthGuard>
  );
}
