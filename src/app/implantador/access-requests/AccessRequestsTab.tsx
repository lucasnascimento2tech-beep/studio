
"use client";

import { useEffect, useState } from "react";
import { getFirestore, collection, query, onSnapshot, doc, updateDoc, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { useUser } from "@/firebase";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AccessRequest, AreaType } from "@/types/journey";
import { Loader2, UserX, Info, Building, MapPin, CheckCircle2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export function AccessRequestsTab() {
  const { user: currentUser } = useUser();
  const db = getFirestore();
  const { toast } = useToast();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [implementations, setImplementations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');

  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [approvalType, setApprovalType] = useState<'master' | 'participant' | 'reject' | null>(null);
  const [targetCompanyId, setTargetCompanyId] = useState<string>("");
  const [targetImplId, setTargetImplId] = useState<string>("");
  const [selectedAreas, setSelectedAreas] = useState<AreaType[]>([]);
  const [reviewComment, setReviewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "accessRequests"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      try {
        setRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AccessRequest)));
      } catch (err) {
        console.error("Erro ao processar solicitações:", err);
      }
      setLoading(false);
    }, (err) => {
      console.error("Erro ao escutar solicitações:", err);
      setLoading(false);
    });

    const fetchContext = async () => {
      try {
        const compSnap = await getDocs(collection(db, "companies"));
        setCompanies(compSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        const implSnap = await getDocs(collection(db, "implementations"));
        setImplementations(implSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Erro ao buscar contexto:", e);
      }
    };
    fetchContext();

    return () => unsubscribe();
  }, [db]);

  const resetForm = () => {
    setApprovalType(null);
    setTargetCompanyId("");
    setTargetImplId("");
    setSelectedAreas([]);
    setReviewComment("");
    setSelectedRequest(null);
  };

  const handleProcessRequest = async () => {
    if (!selectedRequest || !approvalType) return;
    setSubmitting(true);

    try {
      const requestRef = doc(db, "accessRequests", selectedRequest.id);
      const userRef = doc(db, "users", selectedRequest.uid);

      if (approvalType === 'reject') {
        await updateDoc(requestRef, {
          status: "rejected",
          reviewedByUid: currentUser?.uid,
          reviewComment: reviewComment || "Solicitação não aprovada.",
          updatedAt: serverTimestamp()
        });
        await updateDoc(userRef, {
          active: false,
          approvalStatus: "rejected",
          updatedAt: serverTimestamp()
        });
        toast({ title: "Solicitação Rejeitada", description: "O usuário foi notificado." });
      } 
      else if (approvalType === 'master') {
        let companyId = targetCompanyId;
        let implId = targetImplId;

        if (!companyId || companyId === 'none' || companyId === "") {
          const newCompanyRef = await addDoc(collection(db, "companies"), {
            name: selectedRequest.companyName || "Nova Empresa",
            cnpj: selectedRequest.cnpj || "",
            city: selectedRequest.city || "",
            state: selectedRequest.state || "",
            status: "implementation",
            mainContactUid: selectedRequest.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          companyId = newCompanyRef.id;
          await updateDoc(newCompanyRef, { id: companyId });

          const newImplRef = await addDoc(collection(db, "implementations"), {
            companyId,
            status: "in_progress",
            currentPhaseId: "fase-0",
            assignedImplantadorUid: currentUser?.uid,
            progressPercent: 0,
            startedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          implId = newImplRef.id;
          await updateDoc(newImplRef, { id: implId });
          await updateDoc(newCompanyRef, { activeImplementationId: implId });
        }

        await updateDoc(userRef, {
          globalRole: "client_master",
          active: true,
          approvalStatus: "approved",
          companyId,
          implementationId: implId,
          updatedAt: serverTimestamp()
        });

        await addDoc(collection(db, "implementationMembers"), {
          implementationId: implId,
          companyId,
          uid: selectedRequest.uid,
          name: selectedRequest.name,
          email: selectedRequest.email,
          role: "implementation_master",
          clientAccessType: "master",
          areas: ["todos"],
          requiredForMeetings: ["meeting_1_parametrizacao", "meeting_2_operacao", "meeting_3_financeiro"],
          isRequiredParticipant: true,
          inviteStatus: "accepted",
          active: true,
          acceptedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        await updateDoc(requestRef, {
          status: "approved",
          reviewedByUid: currentUser?.uid,
          reviewComment,
          matchedCompanyId: companyId,
          matchedImplementationId: implId,
          updatedAt: serverTimestamp()
        });

        toast({ title: "Aprovado como Master", description: "Empresa e implantação vinculadas." });
      } 
      else if (approvalType === 'participant') {
        if (!targetCompanyId || !targetImplId) {
          toast({ title: "Erro", description: "Selecione empresa e implantação.", variant: "destructive" });
          setSubmitting(false);
          return;
        }

        await updateDoc(userRef, {
          globalRole: "client_participant",
          active: true,
          approvalStatus: "approved",
          companyId: targetCompanyId,
          implementationId: targetImplId,
          updatedAt: serverTimestamp()
        });

        await addDoc(collection(db, "implementationMembers"), {
          implementationId: targetImplId,
          companyId: targetCompanyId,
          uid: selectedRequest.uid,
          name: selectedRequest.name,
          email: selectedRequest.email,
          role: "participant",
          clientAccessType: "participant",
          areas: selectedAreas,
          requiredForMeetings: [],
          isRequiredParticipant: false,
          inviteStatus: "accepted",
          active: true,
          acceptedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        await updateDoc(requestRef, {
          status: "approved",
          reviewedByUid: currentUser?.uid,
          reviewComment,
          matchedCompanyId: targetCompanyId,
          matchedImplementationId: targetImplId,
          updatedAt: serverTimestamp()
        });

        toast({ title: "Participante Aprovado", description: "Vínculo realizado com sucesso." });
      }

      resetForm();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro no processamento", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRequests = requests.filter(r => r && r.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex justify-center gap-4 mb-4">
        {['pending', 'approved', 'rejected'].map((f) => (
          <Button 
            key={f}
            variant={filter === f ? 'default' : 'outline'} 
            onClick={() => setFilter(f as any)}
            className="rounded-full px-8 capitalize"
          >
            {f === 'pending' ? 'Pendentes' : f === 'approved' ? 'Aprovadas' : 'Rejeitadas'}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></div>
      ) : filteredRequests.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-dashed">
          <Info className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500">Nenhuma solicitação {filter} encontrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredRequests.map(req => (
            <Card key={req.id} className="border-none shadow-md overflow-hidden bg-white hover:shadow-lg transition-all">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-bold">{req.name || 'Sem Nome'}</CardTitle>
                    <p className="text-xs text-slate-400">{req.email} • {req.position}</p>
                  </div>
                  <Badge variant={req.status === 'pending' ? 'secondary' : req.status === 'approved' ? 'default' : 'destructive'}>
                    {req.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <p className="font-bold text-slate-400 uppercase">Empresa</p>
                    <p className="font-medium flex items-center gap-1"><Building className="w-3 h-3" /> {req.companyName || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-400 uppercase">CNPJ</p>
                    <p className="font-medium">{req.cnpj || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-400 uppercase">Localização</p>
                    <p className="font-medium flex items-center gap-1"><MapPin className="w-3 h-3" /> {req.city}/{req.state}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-400 uppercase">Solicitado em</p>
                    <p className="font-medium">{(req.createdAt as any)?.toDate?.().toLocaleDateString() || '...'}</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Justificativa:</p>
                  <p className="text-xs text-slate-600 line-clamp-3 italic">"{req.justification || 'Sem justificativa.'}"</p>
                </div>
              </CardContent>
              {req.status === 'pending' && (
                <CardFooter className="bg-slate-50 p-4 border-t">
                  <Dialog onOpenChange={(open) => { if(!open) resetForm(); }}>
                    <DialogTrigger asChild>
                      <Button className="w-full font-bold" onClick={() => {
                        setSelectedRequest(req);
                        setSelectedAreas(req.requestedAreas || []);
                      }}>
                        Avaliar Solicitação
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Processar Solicitação: {req.name}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-6 py-4">
                        <div className="bg-blue-50 p-4 rounded-lg text-xs space-y-2">
                          <p><strong>Solicitado:</strong> {Array.isArray(req.requestedParticipationLabels) ? req.requestedParticipationLabels.join(', ') : 'N/A'}</p>
                          <p><strong>Áreas:</strong> {Array.isArray(req.requestedAreas) ? req.requestedAreas.join(', ') : 'N/A'}</p>
                        </div>

                        <div className="space-y-3">
                          <Label>Como deseja aprovar?</Label>
                          <div className="grid grid-cols-3 gap-3">
                            <Button 
                              variant={approvalType === 'master' ? 'default' : 'outline'} 
                              onClick={() => setApprovalType('master')}
                              className="text-xs h-auto py-2 px-1 text-center flex-col gap-1"
                            >
                              <Building className="w-4 h-4" /> Novo Master
                            </Button>
                            <Button 
                              variant={approvalType === 'participant' ? 'default' : 'outline'} 
                              onClick={() => setApprovalType('participant')}
                              className="text-xs h-auto py-2 px-1 text-center flex-col gap-1"
                            >
                              <Loader2 className="w-4 h-4" /> Participante
                            </Button>
                            <Button 
                              variant={approvalType === 'reject' ? 'destructive' : 'outline'} 
                              onClick={() => setApprovalType('reject')}
                              className="text-xs h-auto py-2 px-1 text-center flex-col gap-1"
                            >
                              <UserX className="w-4 h-4" /> Rejeitar
                            </Button>
                          </div>
                        </div>

                        {approvalType === 'master' && (
                          <div className="space-y-4 border p-4 rounded-lg bg-slate-50">
                            <Label className="text-blue-700 font-bold">Configuração de Nova Empresa</Label>
                            <div className="space-y-2">
                              <Label className="text-xs">Vincular a Empresa existente (opcional)?</Label>
                              <Select onValueChange={setTargetCompanyId} value={targetCompanyId}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Criar nova empresa (Padrão)" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Criar nova empresa</SelectItem>
                                  {companies.map(c => c && c.id && <SelectItem key={c.id} value={c.id}>{c.name || 'Sem nome'}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}

                        {approvalType === 'participant' && (
                          <div className="space-y-4 border p-4 rounded-lg bg-slate-50">
                            <Label className="text-blue-700 font-bold">Configuração de Participante</Label>
                            <div className="grid grid-cols-1 gap-4">
                              <div className="space-y-2">
                                <Label className="text-xs">Selecione a Empresa</Label>
                                <Select onValueChange={setTargetCompanyId} value={targetCompanyId}>
                                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                  <SelectContent>{companies.map(c => c && c.id && <SelectItem key={c.id} value={c.id}>{c.name || 'Sem nome'}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Selecione a Implantação</Label>
                                <Select onValueChange={setTargetImplId} value={targetImplId}>
                                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                  <SelectContent>
                                    {implementations
                                      .filter(i => i && i.companyId === targetCompanyId)
                                      .map(i => i && i.id && <SelectItem key={i.id} value={i.id}>Fase {i.currentPhaseId || '?'}</SelectItem>)
                                    }
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-xs">Áreas Liberadas</Label>
                                <div className="grid grid-cols-2 gap-2">
                                  {['cadastros', 'operacional', 'financeiro', 'relatorios', 'gestao'].map(area => (
                                    <div key={area} className="flex items-center space-x-2">
                                      <Checkbox 
                                        id={`area-${area}`} 
                                        checked={selectedAreas.includes(area as AreaType)} 
                                        onCheckedChange={(c) => {
                                          if (c) setSelectedAreas([...selectedAreas, area as AreaType]);
                                          else setSelectedAreas(selectedAreas.filter(a => a !== area));
                                        }}
                                      />
                                      <Label htmlFor={`area-${area}`} className="text-[10px] capitalize">{area}</Label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2">
                          <Label>Comentário {approvalType === 'reject' ? '(Obrigatório)' : '(Opcional)'}</Label>
                          <Textarea 
                            placeholder="Este comentário será visível para o solicitante." 
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="ghost" onClick={resetForm}>Cancelar</Button>
                        <Button 
                          onClick={handleProcessRequest} 
                          disabled={submitting || !approvalType || (approvalType === 'reject' && !reviewComment)}
                          className={approvalType === 'reject' ? 'bg-red-600 hover:bg-red-700' : ''}
                        >
                          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Processamento"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              )}
              {req.status !== 'pending' && (
                <div className="p-3 bg-slate-50 border-t flex items-center justify-between">
                   <span className="text-[10px] text-slate-400">Revisado em: {(req.updatedAt as any)?.toDate?.().toLocaleDateString() || '...'}</span>
                   <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
