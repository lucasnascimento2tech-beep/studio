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
  AlertTriangle, Clock, ArrowRight, Info, Users, Unlock 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Phase, ImplementationMember } from "@/types/journey";
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
  members?: ImplementationMember[];
  memberProgress?: Record<string, any>;
  onSchedule: (data: { date: string, time: string, notes: string }) => void;
}

export function MeetingStatusCard({ 
  phase, 
  userProgress, 
  userAreas, 
  isClientMaster, 
  members = [], 
  memberProgress = {},
  onSchedule 
}: MeetingStatusCardProps) {
  
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [notes, setNotes] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const status = userProgress.status;
  const isUnlocked = status === 'ReadyToSchedule' || status === 'Scheduled' || status === 'WaitingApproval' || status === 'Completed' || status === 'PendingAdjustments';

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
              <p className="text-sm font-bold text-slate-700">Aguardando Requisitos</p>
              <p className="text-xs text-slate-500">Conclua os módulos obrigatórios e a validação para liberar o agendamento do encontro.</p>
            </div>
          </div>
        );
      
      case 'ReadyToSchedule':
        return (
          <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex items-start gap-3">
            <Unlock className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-green-800">Requisitos Concluídos!</p>
              <p className="text-xs text-green-700">Sua jornada individual nesta fase está pronta. Já pode agendar o encontro guiado.</p>
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
                <p className="text-sm font-bold text-blue-900">Encontro Agendado</p>
                <p className="text-xs text-blue-700">O encontro está registrado no sistema. Aguarde a realização conforme os detalhes abaixo:</p>
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
          </div>
        );

      case 'WaitingApproval':
        return (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-amber-800">Aguardando Avaliação</p>
              <p className="text-xs text-amber-700">O encontro foi realizado e o implantador está revisando seu progresso para liberar a próxima fase.</p>
            </div>
          </div>
        );

      case 'Completed':
        return (
          <div className="bg-green-100 border border-green-300 p-4 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-green-900">Etapa Validada e Concluída!</p>
              <p className="text-xs text-green-700">Parabéns! O implantador aprovou seu desempenho nesta fase.</p>
            </div>
          </div>
        );

      case 'PendingAdjustments':
        return (
          <div className="bg-red-50 border border-red-200 p-5 rounded-xl space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-red-900">Ajustes Solicitados</p>
                <p className="text-xs text-red-700">O implantador revisou seu encontro e solicitou alguns ajustes antes da aprovação final.</p>
              </div>
            </div>
            {userProgress.meeting?.implantadorComment && (
              <div className="bg-white p-3 rounded-lg border border-red-100 text-xs italic text-red-600">
                "{userProgress.meeting.implantadorComment}"
              </div>
            )}
            <Button size="sm" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold" onClick={() => setIsDialogOpen(true)}>
              Reagendar Encontro
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
                {isUnlocked ? "Etapa Liberada" : "Etapa Bloqueada"}
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
                  Agendar Agora <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Agendar Encontro: {phase.title}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="date">Data Sugerida</Label>
                    <Input id="date" type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="time">Horário Sugerido</Label>
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
                    Confirmar Registro
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardFooter>
        )}
      </Card>

      {isClientMaster && members.length > 0 && (
        <Card className="border-slate-200 bg-white shadow-md overflow-hidden">
          <CardHeader className="py-4 bg-slate-50 border-b">
            <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Users className="w-4 h-4" /> Acompanhamento da Equipe (Informativo)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[300px] overflow-y-auto">
              {members.map(m => {
                const prog = m.uid ? memberProgress[m.uid] : null;
                const mAreas = m.areas || ['todos'];
                const mRequired = phase.modules.filter(mod => 
                  mod.isRequired && (mAreas.includes(mod.area) || mAreas.includes('todos'))
                );
                const mCompleted = prog?.completedModules?.length || 0;
                const mDone = mRequired.length > 0 && mCompleted >= mRequired.length;

                return (
                  <div key={m.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 border">
                        {m.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">{m.name}</p>
                        <p className="text-[9px] text-slate-400 capitalize">{m.areas.join(', ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-500">{mCompleted}/{mRequired.length}</p>
                        <div className="w-16 h-1 bg-slate-100 rounded-full mt-1">
                          <div 
                            className={cn("h-full transition-all", mDone ? "bg-green-500" : "bg-primary")} 
                            style={{ width: `${mRequired.length > 0 ? (mCompleted / mRequired.length) * 100 : 0}%` }} 
                          />
                        </div>
                      </div>
                      {mDone ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4 text-slate-200" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
