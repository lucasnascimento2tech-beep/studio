
"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Calendar, CheckCircle2, 
  AlertTriangle, Clock, ArrowRight, Unlock, Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Phase } from "@/types/journey";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

interface MeetingStatusCardProps {
  phase: Phase;
  userProgress: {
    completedModules: string[];
    uploadedEvidence: Record<string, any>;
    status: string;
    meeting?: any;
  };
  userAreas: string[];
  isClientMaster: boolean;
  onSchedule: (data: { date: string, time: string, notes: string }) => void;
  onMarkReadyForApproval?: (phaseId: string) => void;
}

export function MeetingStatusCard({ 
  phase, 
  userProgress, 
  userAreas, 
  isClientMaster, 
  onSchedule,
  onMarkReadyForApproval
}: MeetingStatusCardProps) {
  
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [notes, setNotes] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const status = userProgress.status;
  const isUnlocked = ['ReadyToSchedule', 'Scheduled', 'WaitingApproval', 'Completed', 'PendingAdjustments'].includes(status);

  const handleSchedule = () => {
    if (!meetingDate || !meetingTime) return;
    onSchedule({ date: meetingDate, time: meetingTime, notes });
    setIsDialogOpen(false);
  };

  const renderStatusContent = () => {
    switch (status) {
      case 'Locked':
      case 'InProgress':
      case 'WaitingCheckpoint':
        return (
          <div className="bg-slate-50 border p-4 rounded-xl flex items-start gap-3">
            <Clock className="w-5 h-5 text-slate-400 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-700">Encontro ainda não liberado</p>
              <p className="text-xs text-slate-500">Conclua os módulos obrigatórios desta fase e responda a validação para liberar o agendamento.</p>
            </div>
          </div>
        );
      
      case 'ReadyToSchedule':
        return (
          <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex items-start gap-3">
            <Unlock className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-green-800">Encontro liberado!</p>
              <p className="text-xs text-green-700">Você concluiu os requisitos desta fase. Agora já pode agendar o encontro com o implantador.</p>
            </div>
          </div>
        );

      case 'Scheduled':
        const meet = userProgress.meeting;
        return (
          <div className="bg-blue-50 border border-blue-200 p-5 rounded-xl space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-6 h-6 text-blue-600" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-blue-900">Encontro agendado</p>
                <p className="text-xs text-blue-700">Após a realização do encontro, marque esta etapa como realizada para que o implantador possa avaliar.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-blue-100">
              <div>
                <p className="text-[10px] text-blue-400 font-bold uppercase">Data</p>
                <p className="text-sm font-bold text-blue-800">{meet?.scheduledDate || '...'}</p>
              </div>
              <div>
                <p className="text-[10px] text-blue-400 font-bold uppercase">Horário</p>
                <p className="text-sm font-bold text-blue-800">{meet?.scheduledTime || '...'}</p>
              </div>
            </div>
            <Button 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold"
              onClick={() => onMarkReadyForApproval?.(phase.id)}
            >
              <Check className="w-4 h-4 mr-2" /> Marcar como realizado
            </Button>
          </div>
        );

      case 'WaitingApproval':
        return (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-amber-800">Aguardando aprovação do implantador</p>
              <p className="text-xs text-amber-700">O encontro foi marcado como realizado e está aguardando validação da equipe 2tech.</p>
            </div>
          </div>
        );

      case 'Completed':
        return (
          <div className="bg-green-100 border border-green-300 p-4 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-green-900">Fase validada e concluída!</p>
              <p className="text-xs text-green-700">Esta etapa foi aprovada pelo implantador e concluída.</p>
            </div>
          </div>
        );

      case 'PendingAdjustments':
        return (
          <div className="bg-red-50 border border-red-200 p-5 rounded-xl space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-red-900">Ajustes solicitados</p>
                <p className="text-xs text-red-700">O implantador solicitou ajustes antes da conclusão desta fase.</p>
              </div>
            </div>
            {userProgress.meeting?.implantadorComment && (
              <div className="bg-white p-3 rounded-lg border border-red-100 text-xs italic text-red-600">
                "{userProgress.meeting.implantadorComment}"
              </div>
            )}
            <Button size="sm" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold" onClick={() => setIsDialogOpen(true)}>
              Reagendar encontro
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card className={cn(
        "border-2 shadow-lg transition-all",
        isUnlocked ? "border-green-200 bg-white" : "border-slate-100 bg-slate-50/50"
      )}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-3 rounded-xl",
              isUnlocked ? "bg-primary/10 text-primary" : "bg-slate-200 text-slate-500"
            )}>
              {status === 'Completed' ? <CheckCircle2 className="w-6 h-6" /> : <Calendar className="w-6 h-6" />}
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-slate-800">
                {phase.meetingTitle || "Encontro com Implantador"}
              </CardTitle>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                {isUnlocked ? "Etapa liberada" : "Etapa bloqueada"}
              </p>
            </div>
          </div>
          <Badge variant={status === 'Completed' ? "default" : "outline"} className={status === 'Completed' ? "bg-green-600" : ""}>
            {status}
          </Badge>
        </CardHeader>
        
        <CardContent className="pt-4">
          {renderStatusContent()}
        </CardContent>

        {status === 'ReadyToSchedule' && (
          <CardFooter className="bg-slate-50/50 border-t p-4 flex justify-end">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 font-bold h-12 px-8 shadow-lg shadow-primary/20">
                  Agendar encontro <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Agendar encontro: {phase.title}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="date">Data sugerida</Label>
                    <Input id="date" type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="time">Horário sugerido</Label>
                    <Input id="time" type="time" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="notes">Observações (opcional)</Label>
                    <Textarea 
                      id="notes" 
                      placeholder="Algum ponto específico que queira tratar?" 
                      value={notes} 
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleSchedule} className="w-full font-bold h-12" disabled={!meetingDate || !meetingTime}>
                    Confirmar agendamento
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
