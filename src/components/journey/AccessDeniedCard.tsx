
"use client";

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import Link from "next/link";

export function AccessDeniedCard() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="max-w-md w-full text-center py-12 border-none shadow-xl">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-slate-900">Acesso não disponível</CardTitle>
        </CardHeader>
        <CardContent className="text-slate-500 space-y-4">
          <p>Este módulo não faz parte das áreas liberadas para o seu usuário nesta implantação.</p>
          <p className="text-sm">Caso precise desse acesso, solicite ao responsável pela implantação da sua empresa.</p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button asChild variant="outline">
            <Link href="/"><ArrowLeft className="w-4 h-4 mr-2" /> Voltar para minha jornada</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
