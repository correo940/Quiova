'use client';

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const handleLogin = () => {
    signIn("github", { callbackUrl: "/admin" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="mx-auto max-w-sm space-y-6 p-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Panel de Administración</h1>
          <p className="text-gray-500">
            Inicia sesión para gestionar los artículos
          </p>
        </div>
        <Button
          onClick={handleLogin}
          className="w-full"
        >
          Iniciar sesión con GitHub
        </Button>
      </div>
    </div>
  );
}