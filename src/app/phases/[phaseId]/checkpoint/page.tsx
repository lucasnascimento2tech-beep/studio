
"use client";

import { useParams, useRouter } from "next/navigation";
import { journeyPhases } from "@/data/journeyData";
import { useJourneyStore } from "@/hooks/useJourneyStore";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

export default function CheckpointPage() {
  const { phaseId } = useParams();
  const router = useRouter();
  const { progress, isLoaded, saveQuizScore } = useJourneyStore();
  const { toast } = useToast();

  const phase = journeyPhases.find(p => p.id === phaseId);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);

  if (!isLoaded || !phase) return null;

  const handleSubmit = () => {
    if (Object.keys(answers).length < (phase.quiz.length || 1)) {
       toast({ title: "Incompleto", description: "Responda todas as questões.", variant: "destructive" });
       return;
    }

    // In this mock, everything is open-ended or we just simulate a score
    // Since prompt didn't define exact options for all, we simulate a passing score
    const simulatedScore = 100; // Let's assume correct for demo
    const passed = simulatedScore >= 70;
    
    setResult({ score: simulatedScore, passed });
    saveQuizScore(phase.id, simulatedScore);

    if (passed) {
      toast({ title: "Checkpoint Concluído!", description: "Sua fase foi validada com sucesso." });
    }
  };

  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <div className={result.passed ? "text-green-500" : "text-red-500"}>
            {result.passed ? <CheckCircle2 className="w-20 h-20 mx-auto mb-4" /> : <AlertCircle className="w-20 h-20 mx-auto mb-4" />}
          </div>
          <h2 className="text-2xl font-bold mb-2">{result.passed ? "Aprovado!" : "Tente Novamente"}</h2>
          <p className="text-muted-foreground mb-6">Sua pontuação final foi de <strong>{result.score}%</strong>.</p>
          <Button asChild className="w-full bg-primary">
            <Link href={`/phases/${phase.id}`}>Voltar para a Fase</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="bg-white border-b py-4 mb-8">
        <div className="max-w-3xl mx-auto px-4">
          <Button variant="ghost" size="sm" asChild className="mb-4 text-muted-foreground">
            <Link href={`/phases/${phase.id}`}><ArrowLeft className="w-4 h-4 mr-2" /> Cancelar Validação</Link>
          </Button>
          <h1 className="text-2xl font-headline font-bold text-primary">Checkpoint: {phase.title}</h1>
          <p className="text-muted-foreground text-sm">Responda as questões para validar seu conhecimento e avançar.</p>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 space-y-6">
        {phase.quiz.length > 0 ? (
          phase.quiz.map((q, idx) => (
            <Card key={q.id}>
              <CardHeader>
                <CardTitle className="text-base text-primary">{idx + 1}. {q.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <textarea 
                  className="w-full text-sm p-3 rounded-md border min-h-[80px] bg-white resize-none outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Descreva sua resposta com base no que aprendeu..."
                  onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                />
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Esta fase não possui um questionário específico. Clique abaixo para confirmar a conclusão.
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end pt-4">
          <Button size="lg" className="bg-secondary text-primary font-bold hover:bg-secondary/90 px-12" onClick={handleSubmit}>
            Enviar Validação
          </Button>
        </div>
      </main>
    </div>
  );
}
