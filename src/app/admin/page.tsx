
"use client";

import { useEffect, useState, useMemo } from "react";
import { getFirestore, collection, onSnapshot, query, where, getDocs } from "firebase/firestore";
import { useUser } from "@/firebase";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { 
  LayoutDashboard, Users, Rocket, AlertTriangle, 
  Calendar, FileText, BarChart3, Search, Clock, 
  CheckCircle2, ArrowRight, UserCheck, ShieldCheck, Loader2
} from "lucide-react";
import { UserNav } from "@/components/layout/UserNav";
import Link from "next/link";
import { 
  AdminStats, 
  ImplantadorStat, 
  ImplementationAlert,
  getDateFromFirestore,
  getLastActivityDate,
  calculateImplementationCurrentPhase,
  calculateImplementationRisk,
  calculateAverageImplementationTime,
  getImplementationAlerts
} from "@/utils/adminMetrics";
import { startOfMonth, isAfter } from "date-fns";

export default function AdminDashboardPage() {
  const { user } = useUser();
  const db = getFirestore();

  // Estados dos Dados
  const [data, setData] = useState({
    users: [] as any[],
    companies: [] as any[],
    implementations: [] as any[],
    implementationMembers: [] as any[],
    moduleProgress: [] as any[],
    phaseProgress: [] as any[],
    meetings: [] as any[],
    quizSubmissions: [] as any[],
    accessRequests: [] as any[]
  });

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Listeners Firestore
  useEffect(() => {
    if (user?.globalRole !== 'admin_2tech') return;

    const collections = [
      'users', 'companies', 'implementations', 'implementationMembers', 
      'moduleProgress', 'phaseProgress', 'meetings', 'quizSubmissions', 'accessRequests'
    ];

    const unsubscribes = collections.map(col => {
      return onSnapshot(collection(db, col), (snap) => {
        setData(prev => ({
          ...prev,
          [col]: snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        }));
      });
    });

    // Check loading state
    const timer = setTimeout(() => setLoading(false), 2000);

    return () => {
      unsubscribes.forEach(unsub => unsub());
      clearTimeout(timer);
    };
  }, [db, user?.globalRole]);

  // Cálculos de Métricas
  const stats = useMemo((): AdminStats => {
    const monthStart = startOfMonth(new Date());
    return {
      activeImplementations: data.implementations.filter(i => i.status !== 'completed').length,
      completedImplementations: data.implementations.filter(i => i.status === 'completed').length,
      startedThisMonth: data.implementations.filter(i => {
        const date = getDateFromFirestore(i.startedAt || i.createdAt);
        return date && isAfter(date, monthStart);
      }).length,
      avgTimeDays: calculateAverageImplementationTime(data.implementations),
      pendingMeetings: data.meetings.filter(m => m.status === 'WaitingApproval').length,
      pendingEvidence: data.moduleProgress.filter(m => m.evidenceStatus === 'submitted').length,
      stalledClients: data.implementations.filter(i => {
        const last = getLastActivityDate(i.id, data);
        return last && (Date.now() - last.getTime()) > 7 * 24 * 60 * 60 * 1000;
      }).length,
      pendingRequests: data.accessRequests.filter(r => r.status === 'pending').length
    };
  }, [data]);

  const implantadorStats = useMemo((): ImplantadorStat[] => {
    const imps = data.users.filter(u => u.globalRole === 'implantador');
    return imps.map(imp => {
      const assignedImpls = data.implementations.filter(i => i.assignedImplantadorUid === imp.uid);
      const inProgress = assignedImpls.filter(i => i.status !== 'completed');
      const completed = assignedImpls.filter(i => i.status === 'completed');
      const implIds = assignedImpls.map(i => i.id);

      const pendingMeets = data.meetings.filter(m => implIds.includes(m.implementationId) && m.status === 'WaitingApproval').length;
      const pendingEvid = data.moduleProgress.filter(m => implIds.includes(m.implementationId) && m.evidenceStatus === 'submitted').length;
      const stalled = inProgress.filter(i => {
        const last = getLastActivityDate(i.id, data);
        return last && (Date.now() - last.getTime()) > 7 * 24 * 60 * 60 * 1000;
      }).length;

      return {
        uid: imp.uid,
        name: imp.name || "Sem nome",
        email: imp.email,
        assigned: assignedImpls.length,
        inProgress: inProgress.length,
        completed: completed.length,
        pendingMeetings: pendingMeets,
        pendingEvidence: pendingEvid,
        stalled: stalled,
        avgTime: calculateAverageImplementationTime(assignedImpls),
        workload: inProgress.length >= 8 ? 'Alta' : inProgress.length >= 4 ? 'Normal' : 'Baixa'
      };
    });
  }, [data]);

  const allAlerts = useMemo((): ImplementationAlert[] => {
    return data.implementations.flatMap(i => getImplementationAlerts(i.id, data));
  }, [data]);

  const filteredImplementations = useMemo(() => {
    return data.implementations.filter(impl => {
      const company = data.companies.find(c => c.id === impl.companyId);
      return (company?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [data.implementations, data.companies, searchTerm]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
      <Loader2 className="w-12 h-12 text-primary animate-spin" />
      <p className="text-slate-500 font-medium animate-pulse">Carregando visão administrativa...</p>
    </div>
  );

  return (
    <AuthGuard allowedRoles={['admin_2tech']}>
      <div className="min-h-screen bg-slate-50">
        <nav className="bg-slate-900 text-white py-4 px-8 flex justify-between items-center sticky top-0 z-50 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="bg-primary p-2 rounded-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">Gestão de Implantação</h1>
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Painel Administrativo</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild className="text-white border-white/20 hover:bg-white/10 hidden sm:flex">
              <Link href="/implantador"><LayoutDashboard className="w-4 h-4 mr-2" /> Painel operacional</Link>
            </Button>
            <UserNav user={user} />
          </div>
        </nav>

        <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
          <header>
            <h2 className="text-3xl font-headline font-bold text-slate-900">Visão Geral da Operação</h2>
            <p className="text-slate-500 mt-1 italic">Gestão estratégica de carteira, prazos e produtividade da equipe 2tech.</p>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Em Implantação" value={stats.activeImplementations} icon={<Rocket className="text-blue-600" />} subtitle={`${stats.startedThisMonth} iniciadas no mês`} />
            <StatCard title="Implantações Concluídas" value={stats.completedImplementations} icon={<CheckCircle2 className="text-green-600" />} subtitle={`Tempo médio: ${stats.avgTimeDays}`} />
            <StatCard title="Encontros Pendentes" value={stats.pendingMeetings} icon={<Calendar className="text-orange-600" />} subtitle="Aguardando aprovação" />
            <StatCard title="Clientes Sem Avanço" value={stats.stalledClients} icon={<AlertTriangle className="text-red-600" />} subtitle="Há mais de 7 dias parados" />
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-white border p-1 h-14 rounded-2xl shadow-sm overflow-x-auto justify-start w-full md:w-auto">
              <TabsTrigger value="overview" className="px-6 h-12 rounded-xl font-bold">Visão Geral</TabsTrigger>
              <TabsTrigger value="implantadores" className="px-6 h-12 rounded-xl font-bold">Implantadores</TabsTrigger>
              <TabsTrigger value="implementations" className="px-6 h-12 rounded-xl font-bold">Implantações</TabsTrigger>
              <TabsTrigger value="alerts" className="px-6 h-12 rounded-xl font-bold relative">
                Alertas
                {allAlerts.length > 0 && <Badge className="ml-2 bg-red-500 text-white">{allAlerts.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="meetings" className="px-6 h-12 rounded-xl font-bold">Encontros</TabsTrigger>
              <TabsTrigger value="evidence" className="px-6 h-12 rounded-xl font-bold">Evidências</TabsTrigger>
              <TabsTrigger value="requests" className="px-6 h-12 rounded-xl font-bold">Solicitações</TabsTrigger>
            </TabsList>

            {/* ABA: VISÃO GERAL */}
            <TabsContent value="overview" className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="border-none shadow-md bg-white">
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Distribuição por Fase</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {/* Exemplo simplificado de distribuição */}
                    {['Fase 1', 'Fase 2', 'Fase 3'].map(f => (
                      <div key={f} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium text-slate-600">{f}</span>
                          <span className="font-bold">4 clientes</span>
                        </div>
                        <Progress value={40} className="h-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
                
                <Card className="border-none shadow-md bg-white">
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-500" /> Resumo de Riscos</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                      <p className="text-[10px] font-bold text-red-400 uppercase">Risco Alto</p>
                      <p className="text-2xl font-bold text-red-700">{stats.stalledClients}</p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                      <p className="text-[10px] font-bold text-orange-400 uppercase">Risco Médio</p>
                      <p className="text-2xl font-bold text-orange-700">12</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                      <p className="text-[10px] font-bold text-green-400 uppercase">Risco Baixo</p>
                      <p className="text-2xl font-bold text-green-700">24</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ABA: IMPLANTADORES */}
            <TabsContent value="implantadores">
              <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-6 py-4 text-left">Implantador</th>
                      <th className="px-6 py-4 text-center">Implantações Ativas</th>
                      <th className="px-6 py-4 text-center">Concluídas</th>
                      <th className="px-6 py-4 text-center">Pendências</th>
                      <th className="px-6 py-4 text-center">Carga</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {implantadorStats.map(imp => (
                      <tr key={imp.uid} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                              {imp.name.substring(0,2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-700">{imp.name}</p>
                              <p className="text-[10px] text-slate-400">{imp.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-lg text-slate-700">{imp.inProgress}</td>
                        <td className="px-6 py-4 text-center font-bold text-green-600">{imp.completed}</td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center gap-2">
                             {imp.pendingMeetings > 0 && <Badge variant="secondary" className="bg-orange-50 text-orange-600 border-orange-100">{imp.pendingMeetings} M</Badge>}
                             {imp.pendingEvidence > 0 && <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-blue-100">{imp.pendingEvidence} E</Badge>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge className={imp.workload === 'Alta' ? 'bg-red-500' : imp.workload === 'Normal' ? 'bg-blue-500' : 'bg-green-500'}>
                            {imp.workload}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" className="font-bold text-primary">Ver Carteira</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* ABA: IMPLANTAÇÕES */}
            <TabsContent value="implementations" className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="relative w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    placeholder="Buscar empresa..." 
                    className="pl-10 h-10 bg-white border-slate-200 rounded-xl" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="px-6 py-4 text-left">Empresa</th>
                      <th className="px-6 py-4 text-left">Fase Atual</th>
                      <th className="px-6 py-4 text-left">Implantador</th>
                      <th className="px-6 py-4 text-left">Risco</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredImplementations.map(impl => {
                      const company = data.companies.find(c => c.id === impl.companyId);
                      const currentPhase = calculateImplementationCurrentPhase(impl.id, data.phaseProgress);
                      const risk = calculateImplementationRisk(impl.id, data);
                      const imp = data.users.find(u => u.uid === impl.assignedImplantadorUid);

                      return (
                        <tr key={impl.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-700">{company?.name || "Empresa não encontrada"}</p>
                            <p className="text-[10px] text-slate-400">Ref: {impl.id.substring(0,8)}</p>
                          </td>
                          <td className="px-6 py-4">
                             <Badge variant="outline" className="bg-slate-50">{currentPhase}</Badge>
                          </td>
                          <td className="px-6 py-4">
                             <p className="text-xs font-medium text-slate-600">{imp?.name || "Sem responsável"}</p>
                          </td>
                          <td className="px-6 py-4">
                             <Badge className={risk === 'Alto' ? 'bg-red-100 text-red-700' : risk === 'Médio' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}>
                               {risk}
                             </Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <Button asChild variant="outline" size="sm" className="rounded-lg h-8">
                               <Link href={`/implantador/clients/${impl.id}`}>Abrir <ArrowRight className="w-3 h-3 ml-2" /></Link>
                             </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* ABA: ALERTAS */}
            <TabsContent value="alerts">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {allAlerts.length === 0 ? (
                   <p className="col-span-full py-20 text-center text-slate-500 italic">Nenhum alerta crítico no momento.</p>
                 ) : (
                   allAlerts.map(alert => (
                     <Card key={alert.id} className={`border-l-4 ${alert.severity === 'high' ? 'border-l-red-500' : alert.severity === 'medium' ? 'border-l-orange-500' : 'border-l-blue-500'} shadow-sm`}>
                       <CardContent className="p-4 space-y-3">
                         <div className="flex justify-between items-start">
                            <Badge variant="secondary" className="text-[10px] uppercase font-bold">{alert.type}</Badge>
                            <span className="text-[9px] text-slate-400 font-bold">{alert.lastActivity}</span>
                         </div>
                         <h4 className="font-bold text-slate-800 leading-tight">{alert.companyName}</h4>
                         <p className="text-xs text-slate-500">Resp: <span className="font-medium text-slate-700">{alert.implementadorName}</span></p>
                         <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center gap-2">
                           <UserCheck className="w-3 h-3 text-primary" />
                           <span className="text-[10px] font-bold text-primary uppercase">{alert.action}</span>
                         </div>
                         <Button asChild size="sm" className="w-full mt-2 h-8 text-[10px] font-bold" variant="outline">
                            <Link href={`/implantador/clients/${alert.id.split('_')[0]}`}>Abrir Implantação</Link>
                         </Button>
                       </CardContent>
                     </Card>
                   ))
                 )}
               </div>
            </TabsContent>

            {/* ABAS ADICIONAIS (Resumos) */}
            <TabsContent value="meetings">
               <Card className="p-12 text-center text-slate-400 italic">Central de Encontros (Filtros globais de agenda disponíveis para auditoria)</Card>
            </TabsContent>
            <TabsContent value="evidence">
               <Card className="p-12 text-center text-slate-400 italic">Central de Evidências (Auditoria de qualidade e conformidade)</Card>
            </TabsContent>
            <TabsContent value="requests">
               <Card className="p-12 text-center text-slate-400 italic">Gestão de Solicitações (Acompanhamento de novos acessos e SLAs)</Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </AuthGuard>
  );
}

function StatCard({ title, value, icon, subtitle }: { title: string, value: number | string, icon: any, subtitle: string }) {
  return (
    <Card className="border-none shadow-md overflow-hidden bg-white group hover:shadow-lg transition-all">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-primary/5 transition-colors">
            {icon}
          </div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</h4>
          <p className="text-[10px] text-slate-400 font-medium italic">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}
