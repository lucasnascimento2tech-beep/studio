
"use client";

import { useUser } from "@/firebase";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, ReactNode } from "react";
import { GlobalRole } from "@/types/journey";

interface AuthGuardProps {
  children: ReactNode;
  allowedRoles?: GlobalRole[];
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { user, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    // Bloqueio rígido de client_pending
    if (user.globalRole === 'client_pending' && pathname !== '/pending-approval') {
      router.push("/pending-approval");
      return;
    }

    if (allowedRoles && !allowedRoles.includes(user.globalRole as GlobalRole)) {
      // Redirecionamento inteligente baseado em Role
      if (user.globalRole === 'admin_2tech' || user.globalRole === 'implantador') {
        router.push("/implantador");
      } else if (user.globalRole === 'client_pending') {
        router.push("/pending-approval");
      } else {
        router.push("/");
      }
    }
  }, [user, loading, router, allowedRoles, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Verificando segurança...</p>
        </div>
      </div>
    );
  }

  // Se o usuário está pendente e não está na página de aprovação, não renderiza nada antes do redirect
  if (user?.globalRole === 'client_pending' && pathname !== '/pending-approval') {
    return null;
  }

  if (!user) return null;

  return <>{children}</>;
}
