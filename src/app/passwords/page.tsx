import PasswordsClient from '@/components/apps/passwords/passwords-client';
import { PasswordsProvider } from '@/context/PasswordsContext';

export default function PasswordsPage() {
  return (
    <PasswordsProvider>
        <div className="container mx-auto px-4 py-8 md:py-12">
            <h1 className="font-headline text-4xl md:text-6xl font-bold tracking-tight text-center">
                🔑 Gestor de Contraseñas
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-center text-muted-foreground">
                Guarda y gestiona tus contraseñas de forma segura y privada.
            </p>
            <div className="mt-10">
                <PasswordsClient />
            </div>
        </div>
    </PasswordsProvider>
  );
}
