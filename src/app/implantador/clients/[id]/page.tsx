
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getFirestore, doc, onSnapshot, collection, query, where, updateDoc, serverTimestamp } from "firebase/firestore";
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
  ShieldCheck, ExternalLink, Users, Clock, CheckCircle2
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
  const [loading, setLoading] = useState(true);
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});

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
      setLoading(false);
    });

    return () => {
      unsubscribeImpl();
      unsubscribeMembers();
      unsubscribeProg();
    };
  }, [implementationId, db, router]);

  const handleReviewEvidence = async (evidenceId: string, status: 'approved' | 'adjustment_requested') => {
    const note = reviewNote[evidenceId] || (status === 'approved' ? 'Aprovado após revisão.' : 'Necessário ajuste no anexo.');
    
    try {
      await updateDoc(doc(db, "moduleProgress", evidenceId), {
        evidenceStatus: status,
        implantadorComment: note,
        reviewedAt: serverTimestamp(),
        reviewedByUid: user?.uid
      });
      toast({ 
        title: status === 'approved' ? "Evidência Aprovada" : "Ajuste Solicitado", 
        description: "A resposta foi enviada para o cliente." 
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao salvar avaliação." });
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  const pendingEvidences = allModuleProgress.filter(e => e.evidenceStatus === 'submitted');

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
                <h2 className="text-3xl font-headline font-bold text-slate-900">Empresa Cliente</h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge className="bg-blue-600">Fase Atual: {implementation?.currentPhaseId || 'Preparação'}</Badge>
                  <Badge variant="outline" className="border-primary text-primary font-bold">{implementation?.status?.replace('_', ' ')}</Badge>
                  <Badge variant="secondary" className="bg-slate-100 text-slate-500">{members.length} Participantes</Badge>
                </div>
              </div>
            </div>
          </header>

          <Tabs defaultValue="team" className="space-y-6">
            <TabsList className="bg-white border p-1 h-14 rounded-2xl shadow-sm">
              <TabsTrigger value="team" className="px-8 h-12 rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
                Equipe & Progresso Individual
              </TabsTrigger>
              <TabsTrigger value="evidences" className="px-8 h-12 rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
                Evidências Pendentes ({pendingEvidences.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="team">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {members.map(member => {
                  const mProg = allModuleProgress.filter(p => p.uid === (member.uid || member.email));
                  const completedModulesCount = mProg.filter(p => p.status === 'completed').length;
                  
                  // Heurística de progresso baseada na fase atual e áreas do usuário
                  const currentPhase = journeyPhases.find(p => p.id === implementation?.currentPhaseId) || journeyPhases[0];
                  const mAreas = member.areas || ['todos'];
                  const reqInPhase = currentPhase.modules.filter(m => m.isRequired && (mAreas.includes(m.area) || mAreas.includes('todos'))).length;
                  const doneInPhase = mProg.filter(p => p.phaseId === currentPhase.id && p.status === 'completed').length;
                  const perc = reqInPhase > 0 ? Math.round((doneInPhase / reqInPhase) * 100) : (completedModulesCount > 0 ? 100 : 0);

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
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400 font-bold uppercase">Progresso na Fase</span>
                          <span className="font-bold text-primary">{perc}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={cn("h-full transition-all", perc === 100 ? "bg-green-500" : "bg-primary")} style={{ width: `${perc}%` }} />
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {mAreas.map(a => (
                            <Badge key={a} variant="secondary" className="text-[9px] bg-slate-50 text-slate-500">{a}</Badge>
                          ))}
                        </div>
                        <div className="pt-2 border-t flex justify-between items-center text-[10px]">
                          <span className="text-slate-400">Total Módulos Concluídos: <strong>{completedModulesCount}</strong></span>
                          {perc === 100 ? (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-2 py-0">Pronto</Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-400 px-2 py-0">Em Jornada</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="evidences">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {pendingEvidences.length === 0 ? (
                  <Card className="col-span-full py-20 text-center border-dashed border-2">
                    <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Nenhuma evidência aguardando revisão.</p>
                  </Card>
                ) : (
                  pendingEvidences.map(evidence => (
                    <Card key={evidence.id} className="border-none shadow-md overflow-hidden bg-white">
                      <div className="p-6 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <Badge variant="outline" className="mb-2 uppercase text-[10px] font-bold text-slate-400">
                              Módulo: {evidence.moduleId}
                            </Badge>
                            <h4 className="font-bold text-slate-900">De: {members.find(m => (m.uid === evidence.uid || m.email === evidence.uid))?.name || 'Membro'}</h4>
                          </div>
                          <Badge variant="secondary" className="bg-orange-100 text-orange-700">Aguardando Revisão</Badge>
                        </div>

                        {evidence.fileName && (
                          <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                              <span className="text-xs font-medium text-blue-800 truncate">{evidence.fileName}</span>
                            </div>
                            <Button variant="ghost" size="sm" className="h-8 text-blue-700 font-bold">
                              Ver <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                          </div>
                        )}

                        <div className="space-y-4 pt-4 border-t">
                          <Textarea 
                            placeholder="Adicionar um comentário para o cliente..." 
                            className="text-xs min-h-[80px]"
                            value={reviewNote[evidence.id] || ""}
                            onChange={(e) => setReviewNote({...reviewNote, [evidence.id]: e.target.value})}
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <Button 
                              variant="outline" 
                              className="text-red-600 border-red-200 hover:bg-red-50 font-bold"
                              onClick={() => handleReviewEvidence(evidence.id, 'adjustment_requested')}
                            >
                              Solicitar Ajuste
                            </Button>
                            <Button 
                              className="bg-green-600 hover:bg-green-700 text-white font-bold"
                              onClick={() => handleReviewEvidence(evidence.id, 'approved')}
                            >
                              Aprovar Evidência
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </AuthGuard>
  );
}
