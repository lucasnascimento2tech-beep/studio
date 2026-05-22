
"use client";

import { useEffect, useState, useMemo } from "react";
import { getFirestore, collection, query, where, onSnapshot } from "firebase/firestore";
import { useUser } from "@/firebase";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2, LayoutDashboard, Calendar, Check, X, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { AccessRequestsTab } from "./access-requests/AccessRequestsTab";
import { UserNav } from "@/components/layout/UserNav";
import { useJourneyStore } from "@/hooks/useJourneyStore";
import { useToast } from "@/hooks/use-toast";

export default function ImplantadorPage() {
  const { user } = useUser();
  const db = getFirestore();
  const { toast } = useToast();
  const { approveMeeting, requestMeetingAdjustments } = useJourneyStore();
  
  const [isMounted, setIsMounted] = useState(false);
  const [implementations, setImplementations] = useState<any[]>([]);
  const [companies, setCompanies] = useState<Record<string, any>>({});
  const [pendingMeetings, setPendingMeetings] = useState<any[]>([]);
  const [loadingImpls, setLoadingImpls] = useState(true);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  const [reviewComment, setReviewComment] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isAdmin = user?.globalRole === 'admin_2tech';

  // 1. Listener: Empresas (Limitamos o carregamento para staff)
  useEffect(() => {
    if (!isMounted || !user?.uid) return;
    if (user.globalRole !== 'admin_2tech' && user.globalRole !== 'implantador') return;

    const unsubscribe = onSnapshot(collection(db, "companies"), (snap) => {
      const companyMap: Record<string, any> = {};
      snap.docs.forEach(doc => {
        companyMap[doc.id] = doc.data();
      });
      setCompanies(companyMap);
    });

    return () => unsubscribe();
  }, [db, user?.uid, user?.globalRole, isMounted]);

  // 2. Listener: Implantações
  useEffect(() => {
    if (!isMounted || !user?.uid) return;

    let qImpl;
    if (isAdmin) {
      qImpl = query(collection(db, "implementations"));
    } else {
      qImpl = query(
        collection(db, "implementations"), 
        where("assignedImplantadorUid", "==", user.uid)
      );
    }

    const unsubscribe = onSnapshot(qImpl, (snapshot) => {
      setImplementations(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingImpls(false);
    }, (err) => {
      console.error("Erro implementations:", err);
      setLoadingImpls(false);
    });

    return () => unsubscribe();
  }, [db, user?.uid, user?.globalRole, isMounted, isAdmin]);

  // Chave estável para o listener de meetings não recriar desnecessariamente
  const implementationIdsKey = useMemo(() => 
    implementations.map(i => i.id).sort().join(","),
  [implementations]);

  // 3. Listener: Encontros para Validar
  useEffect(() => {
    if (!isMounted || !user?.uid) return;

    const assignedIds = implementations.map(i => i.id);
    
    // Se for implantador e não tiver clientes, não precisa escutar meetings
    if (!isAdmin && assignedIds.length === 0 && !loadingImpls) {
      setPendingMeetings([]);
      setLoadingMeetings(false);
      return;
    }

    const qMeetings = query(
      collection(db, "meetings"), 
      where("status", "in", ["WaitingApproval", "PendingAdjustments"])
    );

    const unsubscribe = onSnapshot(qMeetings, (meetSnap) => {
      const allMeetings = meetSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (isAdmin) {
        setPendingMeetings(allMeetings);
      } else {
        setPendingMeetings(allMeetings.filter(m => assignedIds.includes(m.implementationId)));
      }
      setLoadingMeetings(false);
    }, (err) => {
      console.error("Erro meetings:", err);
      setLoadingMeetings(false);
    });

    return () => unsubscribe();
  }, [db, user?.uid, user?.globalRole, isMounted, isAdmin, implementationIdsKey, loadingImpls]);

  // 4. Listener: Solicitações de Acesso
  useEffect(() => {
    if (!isMounted || !user?.uid) return;
    if (user.globalRole !== 'admin_2tech' && user.globalRole !== 'implantador') return;

    const qRequests = query(collection(db, "accessRequests"), where("status", "==", "pending"));
    const unsubscribe = onSnapshot(qRequests, (snapshot) => {
      setPendingRequestsCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [db, user?.uid, user?.globalRole, isMounted]);

  const handleApprove = async (meet: any) => {
    const isAssigned = implementations.some(i => i.id === meet.implementationId);
    if (!isAdmin && !isAssigned) {
      toast({ variant: "destructive", title: "Ação não permitida", description: "Esta implantação não está sob sua responsabilidade." });
      return;
    }

    setIsProcessing(true);
    try {
      await approveMeeting({
        uid: meet.uid,
        implId: meet.implementationId,
        compId: meet.companyId,
        phaseId: meet.phaseId,
        comment: reviewComment[meet.id]
      });
      toast({ title: "Encontro aprovado!", description: "A fase foi concluída para este usuário." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro na aprovação", description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestAdjustments = async (meet: any) => {
    const isAssigned = implementations.some(i => i.id === meet.implementationId);
    if (!isAdmin && !isAssigned) {
      toast({ variant: "destructive", title: "Ação não permitida", description: "Esta implantação não está sob sua responsabilidade." });
      return;
    }

    const comment = reviewComment[meet.id];
    if (!comment) {
      toast({ variant: "destructive", title: "Comentário obrigatório", description: "Informe o que precisa ser ajustado." });
      return;
    }
    setIsProcessing(true);
    try {
      await requestMeetingAdjustments({
        uid: meet.uid,
        implId: meet.implementationId,
        compId: meet.companyId,
        phaseId: meet.phaseId,
        comment
      });
      toast({ title: "Ajuste solicitado", description: "O usuário receberá o feedback." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isMounted) return null;

  const loading = loadingImpls || (loadingMeetings && implementations.length > 0);

  const filteredImpls = implementations.filter(i => {
    const cName = companies[i.companyId]?.name || "Sem Nome";
    return cName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <AuthGuard allowedRoles={['implantador', 'admin_2tech']}>
      <div className="min-h-screen bg-slate-50">
        <nav className="bg-slate-900 text-white py-4 px-8 flex justify-between items-center sticky top-0 z-30 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-2 rounded-lg">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">Portal do Especialista</h1>
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Minha Gestão</span>
            </div>
          </div>
          <UserNav user={user} />
        </nav>

        <main className="max-w-7xl mx-auto p-8">
          <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h2 className="text-3xl font-headline font-bold text-slate-900">Painel de Controle</h2>
              <p className="text-slate-500 mt-1 italic">
                {isAdmin ? 'Gestão global de todas as implantações.' : 'Gestão individual de seus participantes e empresas.'}
              </p>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Buscar empresa..." 
                className="pl-10 h-12 bg-white border-slate-200 rounded-xl" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </header>

          <Tabs defaultValue="active" className="space-y-8">
            <TabsList className="bg-slate-200/50 p-1 h-12 rounded-xl">
              <TabsTrigger value="active" className="px-6 h-10 font-bold rounded-lg">Clientes</TabsTrigger>
              <TabsTrigger value="meetings" className="px-6 h-10 font-bold relative rounded-lg">
                Encontros p/ Validar
                {pendingMeetings.length > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-blue-600 text-white w-5 h-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                    {pendingMeetings.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="requests" className="px-6 h-10 font-bold relative rounded-lg">
                Solicitações
                {pendingRequestsCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                    {pendingRequestsCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {loading ? (
                  <div className="col-span-full py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
                ) : filteredImpls.length === 0 ? (
                  <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-300">
                    <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Nenhum cliente vinculado ao seu usuário.</p>
                  </div>
                ) : (
                  filteredImpls.map(impl => (
                    <Card key={impl.id} className="border-none shadow-lg hover:shadow-2xl transition-all group overflow-hidden bg-white rounded-3xl">
                      <div className="h-2 bg-primary w-full" />
                      <CardHeader className="pb-4">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-slate-50">
                            Ref: {impl.id?.substring(0, 8)}
                          </Badge>
                          <Badge className="bg-blue-100 text-blue-700 border-none capitalize">
                            {impl.status?.replace('_', ' ')}
                          </Badge>
                        </div>
                        <CardTitle className="text-xl font-bold text-slate-900">{companies[impl.companyId]?.name || 'Carregando...'}</CardTitle>
                        <p className="text-xs text-slate-400">{companies[impl.companyId]?.city}/{companies[impl.companyId]?.state}</p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500 font-medium">Progresso Médio:</span>
                          <span className="font-bold text-primary">{impl.progressPercent || 0}%</span>
                        </div>
                        <Progress value={impl.progressPercent || 0} className="h-2" />
                        
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Responsável</span>
                            <span className="font-bold text-slate-700 text-xs truncate">
                              {impl.assignedImplantadorUid === user?.uid ? "Você" : "Especialista"}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Vínculo</span>
                            <span className="font-bold text-slate-700 text-xs">Ativo</span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="bg-slate-50 p-4 gap-2">
                        <Button className="w-full font-bold h-10 shadow-sm rounded-xl" asChild>
                          <Link href={`/implantador/clients/${impl.id}`}>Gerenciar implantação</Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="meetings">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loading ? (
                   <div className="col-span-full py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
                ) : pendingMeetings.length === 0 ? (
                  <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed">
                    <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500">Nenhum encontro aguardando validação nas suas implantações.</p>
                  </div>
                ) : (
                  pendingMeetings.map(meet => (
                    <Card key={meet.id} className="border-none shadow-md overflow-hidden bg-white">
                      <CardHeader className="bg-slate-50 border-b py-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{meet.phaseId}</p>
                            <CardTitle className="text-lg font-bold text-slate-800">
                              {companies[meet.companyId]?.name || 'Empresa'}
                            </CardTitle>
                          </div>
                          <Badge variant={meet.status === 'WaitingApproval' ? 'secondary' : 'destructive'} className="text-[10px]">
                            {meet.status === 'WaitingApproval' ? 'Aguardando Avaliação' : 'Ajuste Solicitado'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50 p-3 rounded-lg border">
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Data Realização</p>
                            <p className="text-sm font-bold">{meet.scheduledDate}</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-lg border">
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Horário</p>
                            <p className="text-sm font-bold">{meet.scheduledTime}</p>
                          </div>
                        </div>

                        {meet.notes && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Observações do Cliente:</p>
                            <p className="text-xs italic text-slate-600 bg-slate-50 p-3 rounded-lg">"{meet.notes}"</p>
                          </div>
                        )}

                        <div className="space-y-2 pt-2 border-t">
                          <Label className="text-xs font-bold text-slate-500">Parecer do Implantador</Label>
                          <Textarea 
                            placeholder="Descreva aqui o feedback ou ajustes necessários..."
                            className="text-xs min-h-[100px]"
                            value={reviewComment[meet.id] || ""}
                            onChange={(e) => setReviewComment({...reviewComment, [meet.id]: e.target.value})}
                          />
                        </div>
                      </CardContent>
                      <CardFooter className="bg-slate-50 py-4 px-6 border-t grid grid-cols-2 gap-4">
                        <Button 
                          variant="outline" 
                          className="text-red-600 border-red-200 hover:bg-red-50 font-bold"
                          onClick={() => handleRequestAdjustments(meet)}
                          disabled={isProcessing}
                        >
                          <X className="w-4 h-4 mr-2" /> Solicitar Ajuste
                        </Button>
                        <Button 
                          className="bg-green-600 hover:bg-green-700 text-white font-bold"
                          onClick={() => handleApprove(meet)}
                          disabled={isProcessing}
                        >
                          <Check className="w-4 h-4 mr-2" /> Aprovar Etapa
                        </Button>
                      </CardFooter>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="requests">
              <AccessRequestsTab />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </AuthGuard>
  );
}
