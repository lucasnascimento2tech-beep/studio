
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phase, PhaseStatus } from "@/types/journey";
import { Lock, CheckCircle2, Clock, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface PhaseCardProps {
  phase: Phase;
  status: PhaseStatus;
}

const statusConfig: Record<PhaseStatus, { label: string; color: string; icon: any }> = {
  Locked: { label: "Bloqueada", color: "bg-gray-200 text-gray-500", icon: Lock },
  NotStarted: { label: "Não iniciada", color: "bg-gray-100 text-gray-600", icon: Clock },
  InProgress: { label: "Em andamento", color: "bg-blue-100 text-blue-700", icon: Clock },
  WaitingEvidence: { label: "Aguardando evidências", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  ReadyToSchedule: { label: "Pronta para agendar", color: "bg-orange-100 text-orange-700", icon: Calendar },
  Scheduled: { label: "Encontro agendado", color: "bg-purple-100 text-purple-700", icon: Calendar },
  WaitingApproval: { label: "Aguardando aprovação", color: "bg-indigo-100 text-indigo-700", icon: Clock },
  Completed: { label: "Concluída", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  PendingAdjustments: { label: "Pendente de ajuste", color: "bg-red-100 text-red-700", icon: Clock },
};

export function PhaseCard({ phase, status }: PhaseCardProps) {
  const isLocked = status === 'Locked';
  const Icon = statusConfig[status]?.icon || Clock;

  return (
    <Card className={cn(
      "transition-all duration-300 border-2",
      isLocked ? "opacity-60 bg-gray-50 border-transparent" : "hover:border-primary/20 hover:shadow-lg bg-white border-white",
      status === 'Completed' ? "border-green-100" : ""
    )}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start mb-2">
          <Badge variant="outline" className={cn("font-medium", statusConfig[status]?.color)}>
            <Icon className="w-3 h-3 mr-1" />
            {statusConfig[status]?.label}
          </Badge>
          {phase.hasMeeting && (
            <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-100">
              Encontro Obrigatório
            </Badge>
          )}
        </div>
        <CardTitle className={cn("text-xl font-headline", isLocked ? "text-gray-400" : "text-primary")}>
          {phase.order}. {phase.title}
        </CardTitle>
        <CardDescription className="line-clamp-2 min-h-[40px]">
          {phase.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            {phase.modules.length} Módulos
          </div>
          {phase.hasMeeting && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              1 Encontro
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        {isLocked ? (
          <Button disabled className="w-full">
            <Lock className="w-4 h-4 mr-2" />
            Bloqueado
          </Button>
        ) : (
          <Button asChild className="w-full bg-primary hover:bg-primary/90">
            <Link href={`/phases/${phase.id}`}>
              {status === 'Completed' ? "Revisar Fase" : "Acessar Fase"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
