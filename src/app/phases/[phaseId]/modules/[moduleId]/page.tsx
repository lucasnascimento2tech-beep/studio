
"use client";

import { useParams, useRouter } from "next/navigation";
import { journeyPhases } from "@/data/journeyData";
import { useJourneyStore } from "@/hooks/useJourneyStore";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, PlayCircle, FileText, Info, AlertTriangle, Upload, Check, ClipboardList } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
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

  if (!isLoaded || memberLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  const phase = journeyPhases.find(p => p.id === phaseId);
  const module = phase?.modules.find(m => m.id === moduleId);

  if (!phase || !module) return <div className="p-20 text-center">Módulo não encontrado.</div>;

  // Proteção de acesso por área
  if (!canAccessModule(user?.globalRole as any, effectiveAreas, module)) {
    return <AccessDeniedCard />;
  }

  const isCompleted = progress.completedModules.includes(module.id);
  const evidence = progress.uploadedEvidence[module.id];

  const handleComplete = async () => {
    setIsSubmitting(true);
    
    if (module.requiresEvidence && !evidence) {
      toast({
        title: "Evidência Necessária",
        description: "Por favor, anexe a evidência solicitada antes de concluir.",
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }

    if (valAnswer.trim().length < 5 && !isCompleted) {
      toast({
        title: "Resposta de Validação",
        description: "Por favor, responda a pergunta de validação com pelo menos 5 caracteres.",
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }

    try {
      await completeModule(module.id, phase.id as string);
      toast({
        title: "Módulo Concluído!",
        description: "Seu progresso individual foi salvo com sucesso.",
      });
      
      router.push(`/phases/${phase.id}`);
    } catch (e) {
      toast({ title: "Erro", description: "Não foi possível salvar seu progresso.", variant: "destructive" });
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
          description: "Sua evidência foi enviada para revisão.",
        });
      } catch (err) {
        toast({ title: "Erro", description: "Falha ao registrar arquivo.", variant: "destructive" });
      }
    }
  };

  return (
    <AuthGuard allowedRoles={['client_master', 'client_participant']}>
      <div className="min-h-screen bg-background pb-12">
        <div className="bg-white border-b py-4">
          <div className="max-w-4xl mx-auto px-4">
            <Button variant="ghost" size="sm" asChild className="mb-4 text-muted-foreground hover:text-primary">
              <Link href={`/phases/${phase.id}`}><ArrowLeft className="w-4 h-4 mr-2" /> Voltar para {phase.title}</Link>
            </Button>
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="bg-blue-50 text-primary border-blue-100 capitalize">{module.area}</Badge>
                  <Badge variant="outline" className="text-xs">{module.type}</Badge>
                </div>
                <h1 className="text-3xl font-headline font-bold text-primary">{module.title}</h1>
              </div>
            </div>
          </div>
        </div>

        <main className="max-w-4xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white p-8 rounded-xl border shadow-sm">
              <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-secondary" /> Conteúdo do Módulo
              </h2>
              
              <div className="aspect-video bg-gray-900 rounded-lg mb-6 flex flex-col items-center justify-center text-white p-6 text-center group cursor-pointer relative overflow-hidden">
                 <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: `url('https://picsum.photos/seed/${module.id}/800/450')` }}></div>
                 <div className="relative z-10 flex flex-col items-center">
                   <PlayCircle className="w-16 h-16 mb-4 group-hover:scale-110 transition-transform text-secondary" />
                   <p className="font-bold text-lg">Assistir Vídeo Treinamento</p>
                 </div>
              </div>

              <div className="prose prose-blue max-w-none text-muted-foreground leading-relaxed">
                <p className="mb-4 text-primary font-bold text-lg">{module.objective}</p>
                <p className="mb-6">{module.content}</p>
                
                <h3 className="text-primary font-bold mb-3 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" /> Passo a Passo
                </h3>
                <ul className="space-y-2 mb-6">
                  {module.steps.map((step, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="bg-secondary/20 text-secondary w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{idx + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>

                {module.commonMistakes && (
                  <div className="bg-red-50 p-4 rounded-lg border border-red-100 mb-6">
                     <h4 className="text-red-800 font-bold text-sm mb-2 flex items-center gap-2">
                       <AlertTriangle className="w-4 h-4" /> Erros Comuns para Evitar
                     </h4>
                     <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                       {module.commonMistakes.map((err, idx) => <li key={idx}>{err}</li>)}
                     </ul>
                  </div>
                )}
              </div>
            </section>

            <section className="bg-white p-8 rounded-xl border shadow-sm">
              <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-secondary" /> Tarefa Prática Sugerida
              </h2>
              <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 text-primary">
                <p className="font-medium text-sm leading-relaxed">{module.practicalTask}</p>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-primary">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Público:</span>
                  <span className="font-bold text-primary">{module.audience}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Tempo Estimado:</span>
                  <span className="font-bold text-primary">{module.estimatedTime}</span>
                </div>
              </CardContent>
            </Card>

            <Card className={cn("shadow-md", isCompleted ? "border-green-200 bg-green-50/20" : "")}>
              <CardHeader>
                <CardTitle className="text-base font-bold text-primary">Sua Conclusão</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {module.requiresEvidence && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Evidência Exigida
                    </Label>
                    <p className="text-[10px] text-muted-foreground mb-2 leading-tight">{module.evidenceDescription}</p>
                    {evidence ? (
                      <div className="flex items-center gap-2 bg-white p-3 rounded-lg border border-green-200 text-green-700 text-[10px] font-bold">
                        <Check className="w-4 h-4" /> {evidence.name} - {evidence.status === 'approved' ? 'Aprovado' : 'Em Revisão'}
                      </div>
                    ) : (
                      <div className="relative group">
                        <Input 
                          type="file" 
                          className="opacity-0 absolute inset-0 cursor-pointer z-10" 
                          onChange={handleFileUpload}
                        />
                        <Button variant="outline" className="w-full h-16 border-dashed border-2 flex flex-col gap-1 group-hover:border-primary group-hover:bg-primary/5 transition-all">
                          <Upload className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                          <span className="text-[10px] font-bold">Anexar Print da Tela</span>
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Pergunta de Validação
                  </Label>
                  <p className="text-[10px] font-bold text-primary mb-2 italic">"{module.validationQuestion}"</p>
                  <textarea 
                    disabled={isCompleted}
                    className="w-full text-xs p-3 rounded-md border min-h-[100px] bg-white resize-none outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    placeholder="Descreva aqui sua resposta..."
                    value={valAnswer}
                    onChange={(e) => setValAnswer(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter>
                {isCompleted ? (
                  <div className="w-full flex items-center justify-center gap-2 text-green-700 font-bold bg-green-100 py-3 rounded-md text-sm border border-green-200">
                    <CheckCircle2 className="w-4 h-4" /> Módulo Concluído
                  </div>
                ) : (
                  <Button 
                    className="w-full bg-secondary text-primary font-bold hover:bg-secondary/90 h-12 shadow-lg"
                    onClick={handleComplete}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Salvando..." : "Concluir Meu Módulo"}
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
