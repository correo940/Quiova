'use client';

import React, { useState, useMemo, useRef } from 'react';
import { usePasswords, Password, PasswordInput } from '@/context/PasswordsContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, Eye, EyeOff, Copy, RefreshCw, Download, Upload, Edit, Trash2, Lock, Unlock, ShieldCheck } from 'lucide-react';

export default function PasswordsClient() {
  const { passwords, addPassword, updatePassword, deletePassword, decryptPassword, importPasswords, isLocked, unlock, lock } = usePasswords();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPassword, setEditingPassword] = useState<Password | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, string>>({});
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lock Screen State
  const [masterPasswordInput, setMasterPasswordInput] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [website, setWebsite] = useState('');
  const [category, setCategory] = useState('');
  const [device, setDevice] = useState('');
  const [location, setLocation] = useState('');

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterPasswordInput) return;

    setUnlocking(true);
    const success = await unlock(masterPasswordInput);
    setUnlocking(false);

    if (success) {
      setMasterPasswordInput('');
      toast.success('Bóveda desbloqueada');
    } else {
      toast.error('Contraseña maestra incorrecta');
    }
  };

  const resetForm = () => {
    setName('');
    setUsername('');
    setPassword('');
    setWebsite('');
    setCategory('');
    setDevice('');
    setLocation('');
    setIsNewPasswordVisible(false);
    setEditingPassword(null);
  };

  const handleAddNewClick = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEditClick = (p: Password) => {
    setEditingPassword(p);
    setName(p.name);
    setUsername(p.username);
    setPassword(decryptPassword(p.passwordHash)); // Show decrypted password for editing
    setWebsite(p.website || '');
    setCategory(p.category || '');
    setDevice(p.device || '');
    setLocation(p.location || '');
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta contraseña?')) {
      deletePassword(id);
      toast.success('¡Contraseña eliminada!');
    }
  };

  const handleSavePassword = () => {
    if (name && username && password) {
      const passwordData: PasswordInput = { name, username, password, website, category, device, location };
      if (editingPassword) {
        updatePassword(editingPassword.id, passwordData);
      } else {
        addPassword(passwordData);
      }
      setIsDialogOpen(false);
      resetForm();
    }
  };

  const generatePassword = () => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let newPassword = '';
    for (let i = 0; i < 16; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      newPassword += charset[randomIndex];
    }
    setPassword(newPassword);
  };

  const handleExportPasswords = () => {
    if (passwords.length === 0) {
      toast.info('No hay contraseñas para exportar.');
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const filename = `passwords_${today}.json`;
    const jsonString = JSON.stringify(passwords, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
    toast.success('¡Contraseñas exportadas con éxito!');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        const imported = JSON.parse(text as string);
        importPasswords(imported);
      } catch (error) {
        toast.error('El archivo no es válido o está corrupto.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleTogglePasswordVisibility = (id: string, hash: string) => {
    if (visiblePasswords[id]) {
      setVisiblePasswords(prev => ({ ...prev, [id]: undefined }));
    } else {
      const decrypted = decryptPassword(hash);
      setVisiblePasswords(prev => ({ ...prev, [id]: decrypted }));
      setTimeout(() => {
        setVisiblePasswords(prev => ({ ...prev, [id]: undefined }));
      }, 5000);
    }
  };

  const handleCopyPassword = async (hash: string) => {
    const decrypted = decryptPassword(hash);
    try {
      await navigator.clipboard.writeText(decrypted);
      toast.success('¡Contraseña copiada al portapapeles!');
    } catch (err) {
      toast.error('No se pudo copiar la contraseña.');
    }
  };

  const filteredPasswords = useMemo(() => {
    return passwords.filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.website?.toLowerCase().includes(search.toLowerCase()) ||
      p.device?.toLowerCase().includes(search.toLowerCase()) ||
      p.location?.toLowerCase().includes(search.toLowerCase())
    );
  }, [passwords, search]);

  if (isLocked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Bóveda Bloqueada</CardTitle>
            <CardDescription>Introduce tu Contraseña Maestra para acceder.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUnlock} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="master-password">Contraseña Maestra</Label>
                <Input
                  id="master-password"
                  type="password"
                  placeholder="••••••••"
                  value={masterPasswordInput}
                  onChange={(e) => setMasterPasswordInput(e.target.value)}
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={unlocking}>
                {unlocking ? 'Desbloqueando...' : 'Desbloquear Bóveda'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center text-xs text-muted-foreground text-center">
            <p>Tus contraseñas están cifradas con seguridad de grado militar (AES-256) derivada de tu clave maestra.</p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-green-500" />
              <CardTitle>Tus contraseñas</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={lock} variant="ghost" className="text-muted-foreground hover:text-destructive">
                <Lock className="mr-2 h-4 w-4" />
                Bloquear
              </Button>
              <Button onClick={handleAddNewClick}>
                <Plus className="mr-2 h-4 w-4" />
                Añadir
              </Button>
              <Button onClick={handleImportClick} variant="outline" size="icon" title="Importar">
                <Upload className="h-4 w-4" />
              </Button>
              <Button onClick={handleExportPasswords} variant="outline" size="icon" title="Exportar">
                <Download className="h-4 w-4" />
              </Button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="application/json" />
            </div>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por nombre, sitio web, dispositivo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredPasswords.length > 0 ? (
            <ul className="space-y-4">
              {filteredPasswords.map(p => (
                <li key={p.id} className="p-4 border rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-accent/50 transition-colors">
                  <div className="flex-grow">
                    <h3 className="font-semibold text-lg">{p.name}</h3>
                    <div className="text-sm text-muted-foreground flex items-center">
                      <p>{p.username}</p>
                      <span className="mx-2">-</span>
                      <p className={`font-mono transition-opacity duration-300 ${visiblePasswords[p.id] ? 'opacity-100' : 'opacity-0'}`}>{visiblePasswords[p.id] || '●●●●●●●●'}</p>
                    </div>
                    {p.website && <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline block mt-1">{p.website}</a>}
                    {(p.device || p.location) && (
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                        {p.device && <p>Dispositivo: {p.device}</p>}
                        {p.device && p.location && <span>|</span>}
                        {p.location && <p>Ubicación: {p.location}</p>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-4 sm:mt-0">
                    <Button variant="ghost" size="icon" onClick={() => handleCopyPassword(p.passwordHash)}><Copy className="h-5 w-5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleTogglePasswordVisibility(p.id, p.passwordHash)}>{visiblePasswords[p.id] ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(p)}><Edit className="h-5 w-5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(p.id)}><Trash2 className="h-5 w-5" /></Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No tienes contraseñas guardadas.</p>
              <p className="text-sm">Añade tu primera contraseña para empezar.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPassword ? 'Editar Contraseña' : 'Añadir Nueva Contraseña'}</DialogTitle>
            <DialogDescription>Completa los detalles para guardar una nueva contraseña de forma segura.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre del Servicio</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Google, Facebook..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="username">Usuario</Label>
                <Input id="username" value={username} onChange={e => setUsername(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="flex items-center gap-2">
                  <Input id="password" type={isNewPasswordVisible ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} />
                  <Button variant="ghost" size="icon" type="button" onClick={() => setIsNewPasswordVisible(prev => !prev)}>{isNewPasswordVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</Button>
                  <Button variant="ghost" size="icon" type="button" onClick={generatePassword}><RefreshCw className="h-5 w-5" /></Button>
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="website">Sitio Web (Opcional)</Label>
              <Input id="website" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Categoría (Opcional)</Label>
              <Input id="category" value={category} onChange={e => setCategory(e.target.value)} placeholder="Ej: Trabajo, Personal..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="device">Dispositivo (Opcional)</Label>
                <Input id="device" value={device} onChange={e => setDevice(e.target.value)} placeholder="Ej: Cámara, Router..." />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">Ubicación (Opcional)</Label>
                <Input id="location" value={location} onChange={e => setLocation(e.target.value)} placeholder="Ej: Cocina, Salón..." />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>Cancelar</Button>
            <Button onClick={handleSavePassword}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
