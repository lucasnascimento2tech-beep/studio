
"use client";

import { useParams, useRouter } from "next/navigation";
import { journeyPhases } from "@/data/journeyData";
import { useJourneyStore } from "@/hooks/useJourneyStore";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, PlayCircle, FileText, Info, AlertTriangle, Upload, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

export default function ModuleDetailPage() {
  const { phaseId, moduleId } = useParams();
  const router = useRouter();
  const { progress, isLoaded, completeModule, uploadEvidence } = useJourneyStore();
  const { toast } = useToast();
  
  const [valAnswer, setValAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isLoaded) return null;

  const phase = journeyPhases.find(p => p.id === phaseId);
  const module = phase?.modules.find(m => m.id === moduleId);

  if (!phase || !module) return <div>Módulo não encontrado.</div>;

  const isCompleted = progress.completedModules.includes(module.id);
  const evidence = progress.uploadedEvidence[module.id];

  const handleComplete = () => {
    setIsSubmitting(true);
    // Simulate some logic check
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
        description: "Por favor, responda a pergunta de validação.",
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }

    completeModule(module.id, phase.id);
    toast({
      title: "Módulo Concluído!",
      description: "Você avançou mais um passo na sua jornada.",
    });
    
    setTimeout(() => {
      router.push(`/phases/${phase.id}`);
    }, 1000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadEvidence(module.id, e.target.files[0].name);
      toast({
        title: "Arquivo Enviado",
        description: "Sua evidência foi registrada com sucesso.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="bg-white border-b py-4">
        <div className="max-w-4xl mx-auto px-4">
          <Button variant="ghost" size="sm" asChild className="mb-4 text-muted-foreground hover:text-primary">
            <Link href={`/phases/${phase.id}`}><ArrowLeft className="w-4 h-4 mr-2" /> Voltar para {phase.title}</Link>
          </Button>
          <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="bg-blue-50 text-primary border-blue-100">{module.area}</Badge>
                <Badge variant="outline" className="text-xs">{module.type}</Badge>
              </div>
              <h1 className="text-3xl font-headline font-bold text-primary">{module.title}</h1>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Content Section */}
          <section className="bg-white p-8 rounded-xl border shadow-sm">
            <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-secondary" /> Conteúdo do Módulo
            </h2>
            
            {/* Mock Video Placeholder */}
            <div className="aspect-video bg-gray-900 rounded-lg mb-6 flex flex-col items-center justify-center text-white p-6 text-center group cursor-pointer relative overflow-hidden">
               <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: `url('https://picsum.photos/seed/${module.id}/800/450')` }}></div>
               <div className="relative z-10 flex flex-col items-center">
                 <PlayCircle className="w-16 h-16 mb-4 group-hover:scale-110 transition-transform text-secondary" />
                 <p className="font-bold text-lg">Assistir Vídeo Treinamento</p>
                 <p className="text-white/60 text-sm">Inserir link do vídeo aqui</p>
               </div>
            </div>

            <div className="prose prose-blue max-w-none text-muted-foreground leading-relaxed">
              <p className="mb-4 text-primary font-medium">{module.objective}</p>
              <p className="mb-6">{module.content}</p>
              
              <h3 className="text-primary font-bold mb-3">Passo a Passo</h3>
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

          {/* Practical Task */}
          <section className="bg-white p-8 rounded-xl border shadow-sm">
            <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-secondary" /> Tarefa Prática
            </h2>
            <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 text-primary">
              <p className="font-medium text-sm">{module.practicalTask}</p>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          {/* Metadata Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-primary">Detalhes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Público:</span>
                <span className="font-bold text-primary">{module.audience}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tempo Estimado:</span>
                <span className="font-bold text-primary">{module.estimatedTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Obrigatoriedade:</span>
                <span className={cn("font-bold", module.isRequired ? "text-red-500" : "text-green-500")}>
                  {module.isRequired ? "Sim" : "Não"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Completion Form */}
          <Card className={cn(isCompleted ? "border-green-200 bg-green-50/20" : "")}>
            <CardHeader>
              <CardTitle className="text-base font-bold text-primary">Sua Validação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {module.requiresEvidence && (
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Evidência Exigida
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">{module.evidenceDescription}</p>
                  {evidence ? (
                    <div className="flex items-center gap-2 bg-white p-2 rounded border border-green-200 text-green-700 text-xs">
                      <Check className="w-4 h-4" /> {evidence.name}
                    </div>
                  ) : (
                    <div className="relative">
                      <Input 
                        type="file" 
                        className="opacity-0 absolute inset-0 cursor-pointer" 
                        onChange={handleFileUpload}
                      />
                      <Button variant="outline" className="w-full h-20 border-dashed border-2 flex flex-col gap-1">
                        <Upload className="w-5 h-5 text-muted-foreground" />
                        <span className="text-xs font-medium">Anexar Print/Arquivo</span>
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Pergunta de Validação
                </Label>
                <p className="text-xs font-medium text-primary mb-2">{module.validationQuestion}</p>
                <textarea 
                  disabled={isCompleted}
                  className="w-full text-sm p-3 rounded-md border min-h-[100px] bg-white resize-none focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="Sua resposta aqui..."
                  value={valAnswer}
                  onChange={(e) => setValAnswer(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter>
              {isCompleted ? (
                <div className="w-full flex items-center justify-center gap-2 text-green-700 font-bold bg-green-100 py-3 rounded-md">
                  <CheckCircle2 className="w-5 h-5" /> Módulo Concluído
                </div>
              ) : (
                <Button 
                  className="w-full bg-secondary text-primary font-bold hover:bg-secondary/90 h-12"
                  onClick={handleComplete}
                  disabled={isSubmitting}
                >
                  Concluir Módulo
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}
