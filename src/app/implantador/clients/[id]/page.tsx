
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getFirestore, doc, onSnapshot, collection, query, where, updateDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { useUser } from "@/firebase";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, CheckCircle2, XCircle, Clock, FileText, 
  Users, MessageSquare, ShieldCheck, Calendar, ExternalLink,
  ChevronRight, AlertCircle
} from "lucide-react";
import Link from "next/link";
import { journeyPhases } from "@/data/journeyData";
import { cn } from "@/lib/utils";

export default function ClientDetailSpecialistPage() {
  const { id: implementationId } = useParams();
  const { user } = useUser();
  const db = getFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [implementation, setImplementation] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [evidences, setEvidences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!implementationId) return;

    // 1. Implementation Data
    const unsubscribeImpl = onSnapshot(doc(db, "implementations", implementationId as string), (docSnap) => {
      if (docSnap.exists()) setImplementation({ id: docSnap.id, ...docSnap.data() });
      else router.push("/implantador");
    });

    // 2. Members Data
    const qMembers = query(collection(db, "implementationMembers"), where("implementationId", "==", implementationId));
    const unsubscribeMembers = onSnapshot(qMembers, (snap) => {
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 3. Evidence Data (Module Progress with Evidence)
    const qEvidences = query(
      collection(db, "moduleProgress"), 
      where("implementationId", "==", implementationId),
      where("evidenceStatus", "in", ["submitted", "approved", "adjustment_requested"])
    );
    const unsubscribeEvidences = onSnapshot(qEvidences, (snap) => {
      setEvidences(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => {
      unsubscribeImpl();
      unsubscribeMembers();
      unsubscribeEvidences();
    };
  }, [implementationId, db, router]);

  const handleReviewEvidence = async (evidenceId: string, status: 'approved' | 'adjustment_requested', comment: string) => {
    try {
      await updateDoc(doc(db, "moduleProgress", evidenceId), {
        evidenceStatus: status,
        implantadorComment: comment,
        reviewedAt: serverTimestamp(),
        reviewedByUid: user?.uid
      });
      toast({ title: status === 'approved' ? "Aprovado" : "Ajuste solicitado", description: "Avaliação registrada com sucesso." });
    } catch (e) {
      toast({ variant: "destructive", title: "Erro", description: "Falha ao salvar avaliação." });
    }
  };

  if (loading) return <div className="p-8 text-center">Carregando detalhes do cliente...</div>;

  return (
    <AuthGuard allowedRoles={['implantador', 'admin_2tech']}>
      <div className="min-h-screen bg-slate-50 pb-20">
        <nav className="bg-slate-900 text-white py-4 px-8 flex items-center gap-6 sticky top-0 z-30 shadow-md">
          <Button variant="ghost" size="icon" asChild className="text-white hover:bg-white/10">
            <Link href="/implantador"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <div>
            <h1 className="font-bold text-lg leading-none">Gestão de Cliente</h1>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">Implantação: {implementation?.id.substring(0,8)}</p>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
          <header className="bg-white p-8 rounded-3xl shadow-sm border flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-3xl font-headline font-bold text-slate-900">Cliente Exemplo Promotora</h2>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge className="bg-blue-600">Fase {implementation?.currentPhaseId.split('-')[1] || '1'}</Badge>
                  <Badge variant="outline" className="border-primary text-primary font-bold">{implementation?.status}</Badge>
                  <Badge variant="secondary" className="bg-slate-100 text-slate-500">{members.length} Participantes</Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border w-full md:w-auto">
              <div className="text-right">
                <p className="text-xs text-slate-400 uppercase font-bold">Progresso Geral</p>
                <p className="text-2xl font-bold text-primary">{implementation?.progressPercent || 0}%</p>
              </div>
              <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${implementation?.progressPercent || 0}%` }} />
              </div>
            </div>
          </header>

          <Tabs defaultValue="evidences" className="space-y-6">
            <TabsList className="bg-white border p-1 h-14 rounded-2xl shadow-sm">
              <TabsTrigger value="evidences" className="px-8 h-12 rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
                Evidências ({evidences.filter(e => e.evidenceStatus === 'submitted').length})
              </TabsTrigger>
              <TabsTrigger value="team" className="px-8 h-12 rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
                Equipe & Áreas
              </TabsTrigger>
              <TabsTrigger value="phases" className="px-8 h-12 rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-white">
                Jornada Detalhada
              </TabsTrigger>
            </TabsList>

            <TabsContent value="evidences">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {evidences.length === 0 ? (
                  <Card className="col-span-full py-20 text-center border-dashed border-2">
                    <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Nenhuma evidência enviada para avaliação.</p>
                  </Card>
                ) : (
                  evidences.map(evidence => (
                    <Card key={evidence.id} className={cn(
                      "border-none shadow-md overflow-hidden",
                      evidence.evidenceStatus === 'approved' ? "ring-2 ring-green-500/20" : ""
                    )}>
                      <div className="p-6 space-y-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <Badge variant="outline" className="mb-2 uppercase text-[10px] font-bold text-slate-400">
                              Módulo: {evidence.moduleId}
                            </Badge>
                            <h4 className="font-bold text-slate-900">Validado por: {members.find(m => m.uid === evidence.uid)?.name || 'Desconhecido'}</h4>
                          </div>
                          <Badge variant={evidence.evidenceStatus === 'approved' ? 'default' : 'secondary'} className={evidence.evidenceStatus === 'approved' ? 'bg-green-600' : 'bg-orange-100 text-orange-700'}>
                            {evidence.evidenceStatus === 'submitted' ? 'Aguardando Revisão' : evidence.evidenceStatus}
                          </Badge>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <p className="text-xs font-bold text-slate-400 uppercase mb-2">Resposta de Validação:</p>
                          <p className="text-sm text-slate-700 italic">"{evidence.answers?.validationText || 'Sem resposta de texto'}"</p>
                        </div>

                        {evidence.fileName && (
                          <Button variant="outline" className="w-full flex justify-between bg-slate-50 hover:bg-slate-100 h-14 border-dashed">
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-primary" />
                              <div className="text-left">
                                <p className="text-xs font-bold text-slate-700 truncate max-w-[200px]">{evidence.fileName}</p>
                                <p className="text-[10px] text-slate-400">Clique para visualizar o anexo</p>
                              </div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-slate-400" />
                          </Button>
                        )}

                        {evidence.evidenceStatus === 'submitted' && (
                          <div className="grid grid-cols-2 gap-3 pt-4 border-t">
                            <Button 
                              variant="outline" 
                              className="text-red-600 border-red-200 hover:bg-red-50 font-bold"
                              onClick={() => handleReviewEvidence(evidence.id, 'adjustment_requested', 'Por favor, revise o anexo, está ilegível.')}
                            >
                              Solicitar Ajuste
                            </Button>
                            <Button 
                              className="bg-green-600 hover:bg-green-700 text-white font-bold"
                              onClick={() => handleReviewEvidence(evidence.id, 'approved', 'Excelente configuração.')}
                            >
                              Aprovar
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="team">
              <Card className="border-none shadow-md">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                        <tr>
                          <th className="px-6 py-4 text-left">Participante</th>
                          <th className="px-6 py-4 text-left">Função & Áreas</th>
                          <th className="px-6 py-4 text-center">Obrigatório</th>
                          <th className="px-6 py-4 text-center">Status Convite</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {members.map(member => (
                          <tr key={member.id} className="hover:bg-slate-50/50">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                                  {member.name.substring(0,2).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900">{member.name}</p>
                                  <p className="text-xs text-slate-400">{member.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1">
                                {member.areas.map((a: string) => (
                                  <Badge key={a} variant="secondary" className="bg-blue-50 text-blue-700 text-[10px]">{a}</Badge>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              {member.isRequiredParticipant ? (
                                <Badge className="bg-orange-500">Sim</Badge>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <Badge variant={member.inviteStatus === 'accepted' ? 'default' : 'outline'} className={member.inviteStatus === 'accepted' ? 'bg-green-600' : 'text-orange-500 border-orange-200'}>
                                {member.inviteStatus === 'accepted' ? 'Ativo' : 'Pendente'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="phases">
              <div className="space-y-4">
                {journeyPhases.map((phase) => (
                  <Card key={phase.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 font-bold">
                          {phase.order}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">{phase.title}</h4>
                          <p className="text-xs text-slate-500">{phase.modules.length} Módulos • {phase.hasMeeting ? 'Encontro Obrigatório' : 'Etapa Digital'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="border-slate-200 text-slate-400">Status no Cliente: Pendente</Badge>
                        <ChevronRight className="w-5 h-5 text-slate-300" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </AuthGuard>
  );
}
