
"use client";

import { useEffect, useState } from "react";
import { getFirestore, collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { useUser } from "@/firebase";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Users, CheckCircle, Clock, Search, MessageSquare, UserCheck, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { AccessRequestsTab } from "./access-requests/AccessRequestsTab";

export default function ImplantadorPage() {
  const { user } = useUser();
  const db = getFirestore();
  
  const [implementations, setImplementations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  useEffect(() => {
    // 1. Subscribe to implementations
    const q = query(collection(db, "implementations"));
    const unsubscribeImpl = onSnapshot(q, async (snapshot) => {
      try {
        const impls = await Promise.all(snapshot.docs.map(async (d) => {
          const data = d.data();
          if (!data || !data.companyId) return { id: d.id, companyName: "Sem Empresa", ...data };
          
          try {
            const companySnap = await getDocs(query(collection(db, "companies"), where("id", "==", data.companyId)));
            const companyName = companySnap.empty ? "Empresa não encontrada" : companySnap.docs[0].data().name;
            return { id: d.id, companyName, ...data };
          } catch (err) {
            return { id: d.id, companyName: "Erro ao buscar empresa", ...data };
          }
        }));
        setImplementations(impls.filter(i => !!i));
      } catch (err) {
        console.error("Erro ao carregar implantações:", err);
      }
      setLoading(false);
    });

    // 2. Count pending requests
    const qRequests = query(collection(db, "accessRequests"), where("status", "==", "pending"));
    const unsubscribeRequests = onSnapshot(qRequests, (snapshot) => {
      setPendingRequestsCount(snapshot.size);
    });

    return () => {
      unsubscribeImpl();
      unsubscribeRequests();
    };
  }, [db]);

  const filteredImpls = implementations.filter(i => 
    i && i.companyName && i.companyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AuthGuard allowedRoles={['implantador', 'admin_2tech']}>
      <div className="min-h-screen bg-slate-50">
        <nav className="bg-slate-900 text-white py-4 px-8 flex justify-between items-center sticky top-0 z-30 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-2 rounded-lg">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">Portal do Especialista</h1>
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">2tech Implantação</span>
            </div>
          </div>
          <div className="flex gap-4">
            <Button variant="ghost" className="text-white hover:bg-white/10" asChild>
              <Link href="/">Ir para o App</Link>
            </Button>
            <div className="w-10 h-10 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center font-bold">
              {user?.name?.substring(0, 1) || "A"}
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto p-8">
          <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h2 className="text-3xl font-headline font-bold text-slate-900">Gestão de Clientes</h2>
              <p className="text-slate-500 mt-1 italic">Acompanhe, valide evidências e libere os próximos passos da jornada.</p>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Buscar empresa..." 
                className="pl-10 h-12 bg-white border-slate-200" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </header>

          <Tabs defaultValue="active" className="space-y-8">
            <TabsList className="bg-slate-200/50 p-1 h-12">
              <TabsTrigger value="active" className="px-6 h-10 font-bold">Em Andamento</TabsTrigger>
              <TabsTrigger value="requests" className="px-6 h-10 font-bold relative">
                Solicitações de Acesso
                {pendingRequestsCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                    {pendingRequestsCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed" className="px-6 h-10 font-bold">Concluídos</TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {loading ? (
                  <div className="col-span-full py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
                ) : filteredImpls.length === 0 ? (
                  <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-300">
                    <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Nenhuma implantação encontrada.</p>
                  </div>
                ) : (
                  filteredImpls.map(impl => (
                    <Card key={impl.id} className="border-none shadow-lg hover:shadow-2xl transition-all group overflow-hidden bg-white">
                      <div className="h-2 bg-primary w-full group-hover:h-3 transition-all" />
                      <CardHeader className="pb-4">
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-slate-50">
                            ID: {impl.id.substring(0, 8)}
                          </Badge>
                          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">
                            {impl.status || 'Status'}
                          </Badge>
                        </div>
                        <CardTitle className="text-xl font-bold text-slate-900">{impl.companyName || 'Sem Nome'}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500 font-medium">Progresso Geral:</span>
                          <span className="font-bold text-primary">{impl.progressPercent || 0}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${impl.progressPercent || 0}%` }} />
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Membros</span>
                            <span className="font-bold text-slate-700 flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" /> Ativos
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Próximo Encontro</span>
                            <span className="font-bold text-slate-700 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> Pendente
                            </span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="bg-slate-50 p-4 gap-2">
                        <Button className="w-full font-bold h-10 shadow-sm" asChild>
                          <Link href={`/implantador/clients/${impl.id}`}>Gerenciar Jornada</Link>
                        </Button>
                        <Button variant="outline" size="icon" className="h-10 w-12 hover:bg-white">
                          <MessageSquare className="w-4 h-4 text-slate-600" />
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
            
            <TabsContent value="completed">
               <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-300">
                  <CheckCircle className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">Histórico de implantações concluídas aparecerá aqui.</p>
               </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </AuthGuard>
  );
}
