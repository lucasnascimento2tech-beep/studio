
"use client";

import { useParams, useRouter } from "next/navigation";
import { journeyPhases } from "@/data/journeyData";
import { useJourneyStore } from "@/hooks/useJourneyStore";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, PlayCircle, FileText, Info, AlertTriangle, Upload, Check, ClipboardList, Loader2, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useCurrentImplementationMember } from "@/hooks/useCurrentImplementationMember";
import { canAccessModule } from "@/utils/permissions";
import { AccessDeniedCard } from "@/components/journey/AccessDeniedCard";
import { useUser } from "@/firebase";
import { AuthGuard } from "@/components/auth/AuthGuard";

export default function ModuleDetailPage() {
  const { phaseId, moduleId } = useParams();
  const router = useRouter();
  const { user } = useUser();
  const { progress, isLoaded, completeModule, uploadEvidence } = useJourneyStore();
  const { effectiveAreas, loading: memberLoading } = useCurrentImplementationMember();
  const { toast } = useToast();
  
  const [valAnswer, setValAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const phase = journeyPhases.find(p => p.id === phaseId);
  const module = phase?.modules.find(m => m.id === moduleId);

  useEffect(() => {
    if (isLoaded && module && progress.validationAnswers[module.id]) {
      setValAnswer(progress.validationAnswers[module.id]);
    }
  }, [isLoaded, module?.id, progress.validationAnswers]);

  if (!isLoaded || memberLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  if (!phase || !module) return <div className="p-20 text-center">Módulo não encontrado.</div>;

  if (!canAccessModule(user?.globalRole as any, effectiveAreas, module)) {
    return <AccessDeniedCard />;
  }

  const isCompleted = progress.completedModules.includes(module.id);
  const evidence = progress.uploadedEvidence[module.id];
  const reviewStatus = evidence?.reviewStatus;
  const isApproved = reviewStatus === 'approved';
  const isAdjustment = reviewStatus === 'adjustment_requested';

  const handleComplete = async () => {
    const trimmedAnswer = valAnswer.trim();

    if (module.requiresEvidence && !evidence) {
      toast({
        title: "Evidência Necessária",
        description: "Por favor, anexe a evidência solicitada antes de concluir.",
        variant: "destructive"
      });
      return;
    }

    if (trimmedAnswer.length < 5 && !isApproved) {
      toast({
        title: "Resposta de Validação",
        description: "Por favor, responda a pergunta de validação com pelo menos 5 caracteres.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await completeModule(module.id, phase.id as string, effectiveAreas, trimmedAnswer);
      toast({
        title: "Módulo Enviado!",
        description: "Sua resposta foi enviada para análise do especialista.",
      });
      
      router.push(`/phases/${phase.id}`);
    } catch (e) {
      toast({ title: "Erro", description: "Não foi possível enviar seu progresso.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        await uploadEvidence(module.id, e.target.files[0].name, phase.id as string);
        toast({
          title: "Arquivo Registrado",
          description: "Sua evidência foi enviada para análise.",
        });
      } catch (err) {
        toast({ title: "Erro", description: "Falha ao registrar arquivo.", variant: "destructive" });
      }
    }
  };

  return (
    <AuthGuard allowedRoles={['client_master', 'client_participant']}>
      <div className="min-h-screen bg-background pb-12">
        <div className="bg-white border-b py-4 shadow-sm">
          <div className="max-w-4xl mx-auto px-4">
            <Button variant="ghost" size="sm" asChild className="mb-4 text-slate-400 hover:text-primary">
              <Link href={`/phases/${phase.id}`}><ArrowLeft className="w-4 h-4 mr-2" /> Voltar para {phase.title}</Link>
            </Button>
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="bg-blue-50 text-primary border-blue-100 capitalize">{module.area}</Badge>
                  <Badge variant="outline" className="text-xs font-bold">{module.type}</Badge>
                  {isApproved && <Badge className="bg-green-100 text-green-700 border-green-200">Aprovado pelo Especialista</Badge>}
                  {isAdjustment && <Badge className="bg-red-100 text-red-700 border-red-200">Ajuste Solicitado</Badge>}
                </div>
                <h1 className="text-3xl font-headline font-bold text-primary">{module.title}</h1>
              </div>
            </div>
          </div>
        </div>

        <main className="max-w-4xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white p-8 rounded-2xl border shadow-sm">
              <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-secondary" /> Conteúdo do Módulo
              </h2>
              
              <div className="aspect-video bg-slate-900 rounded-xl mb-6 flex flex-col items-center justify-center text-white p-6 text-center group cursor-pointer relative overflow-hidden shadow-2xl">
                 <div className="absolute inset-0 bg-cover bg-center opacity-40 transition-transform group-hover:scale-105 duration-700" style={{ backgroundImage: `url('https://picsum.photos/seed/${module.id}/800/450')` }}></div>
                 <div className="relative z-10 flex flex-col items-center">
                   <div className="bg-secondary/20 p-4 rounded-full mb-4 backdrop-blur-sm group-hover:bg-secondary/40 transition-colors">
                     <PlayCircle className="w-12 h-12 text-secondary" />
                   </div>
                   <p className="font-bold text-lg tracking-tight">Assistir Vídeo Treinamento</p>
                 </div>
              </div>

              <div className="prose prose-blue max-w-none text-slate-600 leading-relaxed">
                <p className="mb-4 text-primary font-bold text-lg">{module.objective}</p>
                <p className="mb-8">{module.content}</p>
                
                <div className="bg-slate-50 p-6 rounded-2xl border-none mb-8">
                  <h3 className="text-primary font-bold mb-4 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-secondary" /> Passo a Passo
                  </h3>
                  <ul className="space-y-4">
                    {module.steps.map((step, idx) => (
                      <li key={idx} className="flex gap-4 items-start">
                        <span className="bg-primary text-white w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-md shadow-primary/20">{idx + 1}</span>
                        <span className="text-sm font-medium text-slate-700">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {module.commonMistakes && (
                  <div className="bg-red-50 p-6 rounded-2xl border border-red-100 mb-6">
                     <h4 className="text-red-800 font-bold text-sm mb-3 flex items-center gap-2">
                       <AlertTriangle className="w-4 h-4" /> Pontos de Atenção
                     </h4>
                     <ul className="text-sm text-red-700 space-y-2 list-disc list-inside font-medium">
                       {module.commonMistakes.map((err, idx) => <li key={idx}>{err}</li>)}
                     </ul>
                  </div>
                )}
              </div>
            </section>

            <section className="bg-white p-8 rounded-2xl border shadow-sm">
              <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-secondary" /> Exercício de Fixação
              </h2>
              <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100 text-primary">
                <p className="font-medium text-sm leading-relaxed">{module.practicalTask}</p>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <Card className="border-none shadow-md overflow-hidden bg-white">
              <CardHeader className="bg-slate-50 border-b py-4">
                <CardTitle className="text-sm font-bold text-slate-600 uppercase tracking-widest">Resumo do Módulo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs pt-6">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase tracking-tighter">Público</span>
                  <span className="font-bold text-primary">{module.audience}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase tracking-tighter">Tempo</span>
                  <span className="font-bold text-primary">{module.estimatedTime}</span>
                </div>
              </CardContent>
            </Card>

            <Card className={cn("shadow-xl border-2 transition-all duration-500", isApproved ? "border-green-200 bg-green-50/10" : isAdjustment ? "border-red-200 bg-red-50/10" : isCompleted ? "border-amber-200 bg-amber-50/10" : "border-slate-100 bg-white")}>
              <CardHeader>
                <CardTitle className="text-base font-bold text-slate-800">Validação do Módulo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {isAdjustment && evidence?.implantadorComment && (
                  <div className="bg-red-50 p-3 rounded-xl border border-red-100 mb-2">
                    <p className="text-[10px] font-bold text-red-600 uppercase mb-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Feedback do Implantador:
                    </p>
                    <p className="text-xs text-red-800 italic leading-snug">"{evidence.implantadorComment}"</p>
                  </div>
                )}

                {module.requiresEvidence && (
                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Evidência Exigida
                    </Label>
                    <p className="text-[11px] text-slate-500 mb-2 leading-tight italic">{module.evidenceDescription}</p>
                    {evidence ? (
                      <div className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border font-bold shadow-sm text-[10px]",
                        isApproved ? "bg-white border-green-200 text-green-700" :
                        isAdjustment ? "bg-white border-red-200 text-red-700" :
                        "bg-white border-amber-200 text-amber-700"
                      )}>
                        <Check className="w-4 h-4 shrink-0" /> 
                        <span className="truncate">{evidence.name}</span>
                        <Badge variant="outline" className={cn(
                          "ml-auto text-[8px]",
                          isApproved ? "border-green-200 text-green-600" :
                          isAdjustment ? "border-red-200 text-red-600" :
                          "border-amber-200 text-amber-600"
                        )}>
                          {isApproved ? 'Aprovado' : isAdjustment ? 'Corrigir' : 'Em Análise'}
                        </Badge>
                      </div>
                    ) : null}

                    {(!isApproved || isAdjustment) && (
                      <div className="relative group">
                        <Input 
                          type="file" 
                          className="opacity-0 absolute inset-0 cursor-pointer z-10 h-full" 
                          onChange={handleFileUpload}
                        />
                        <Button variant="outline" className="w-full h-20 border-dashed border-2 flex flex-col gap-1 group-hover:border-primary group-hover:bg-primary/5 transition-all rounded-xl">
                          <Upload className="w-5 h-5 text-slate-300 group-hover:text-primary mb-1" />
                          <span className="text-[10px] font-bold text-slate-400 group-hover:text-primary">
                            {evidence ? 'Substituir arquivo' : 'Anexar Print da Tela'}
                          </span>
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Resposta de Validação
                  </Label>
                  <p className="text-xs font-bold text-primary mb-2 italic">"{module.validationQuestion}"</p>
                  <textarea 
                    disabled={isApproved}
                    className="w-full text-xs p-4 rounded-xl border-2 bg-slate-50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all min-h-[120px] resize-none outline-none"
                    placeholder="Responda aqui para confirmar seu aprendizado..."
                    value={valAnswer}
                    onChange={(e) => setValAnswer(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter>
                {isApproved ? (
                  <div className="w-full flex items-center justify-center gap-2 text-green-700 font-bold bg-green-100 py-4 rounded-xl text-sm border border-green-200">
                    <CheckCircle2 className="w-5 h-5" /> Módulo Validado
                  </div>
                ) : (
                  <Button 
                    className={cn(
                      "w-full font-bold h-14 rounded-xl shadow-xl text-base",
                      isAdjustment ? "bg-red-600 hover:bg-red-700 text-white" : "bg-secondary text-primary hover:bg-secondary/90 shadow-secondary/10"
                    )}
                    onClick={handleComplete}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : 
                     isAdjustment ? "Reenviar para Análise" : "Enviar para Análise"}
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
