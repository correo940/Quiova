'use client';
// Force rebuild

import React, { useState, useMemo, useRef } from 'react';
import { usePasswords, Password, PasswordInput } from '@/context/PasswordsContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, Eye, EyeOff, Copy, RefreshCw, Download, Upload, Edit, Trash2, Lock, Unlock, ShieldCheck, Globe, Smartphone, MapPin, Users, Cloud, Film, ShoppingBag, Briefcase, CreditCard, Folder, ArrowLeft, LayoutGrid } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const POPULAR_SERVICES = [
  { name: 'Google', url: 'google.com', category: 'Correo/Nube', color: 'bg-red-500' },
  { name: 'Facebook', url: 'facebook.com', category: 'Redes Sociales', color: 'bg-blue-600' },
  { name: 'Instagram', url: 'instagram.com', category: 'Redes Sociales', color: 'bg-pink-600' },
  { name: 'Twitter (X)', url: 'twitter.com', category: 'Redes Sociales', color: 'bg-black' },
  { name: 'Netflix', url: 'netflix.com', category: 'Entretenimiento', color: 'bg-red-600' },
  { name: 'Spotify', url: 'spotify.com', category: 'Entretenimiento', color: 'bg-green-500' },
  { name: 'Amazon', url: 'amazon.com', category: 'Compras', color: 'bg-orange-500' },
  { name: 'Apple', url: 'apple.com', category: 'Tecnología', color: 'bg-gray-800' },
  { name: 'Microsoft', url: 'microsoft.com', category: 'Trabajo', color: 'bg-blue-500' },
  { name: 'LinkedIn', url: 'linkedin.com', category: 'Trabajo', color: 'bg-blue-700' },
];

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType, color: string, gradient: string }> = {
  'Redes Sociales': { icon: Users, color: 'text-blue-500', gradient: 'from-blue-500/20 to-purple-500/20' },
  'Correo/Nube': { icon: Cloud, color: 'text-sky-500', gradient: 'from-sky-500/20 to-blue-500/20' },
  'Entretenimiento': { icon: Film, color: 'text-red-500', gradient: 'from-red-500/20 to-orange-500/20' },
  'Compras': { icon: ShoppingBag, color: 'text-pink-500', gradient: 'from-pink-500/20 to-rose-500/20' },
  'Trabajo': { icon: Briefcase, color: 'text-indigo-500', gradient: 'from-indigo-500/20 to-slate-500/20' },
  'Finanzas': { icon: CreditCard, color: 'text-green-500', gradient: 'from-green-500/20 to-emerald-500/20' },
  'Otros': { icon: Folder, color: 'text-gray-500', gradient: 'from-gray-500/20 to-slate-500/20' },
  'Tecnología': { icon: Smartphone, color: 'text-zinc-500', gradient: 'from-zinc-500/20 to-neutral-500/20' },
};

export default function PasswordsClient() {
  const { passwords, loading, addPassword, updatePassword, deletePassword, decryptPassword, importPasswords, isLocked, unlock, lock } = usePasswords();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPassword, setEditingPassword] = useState<Password | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, string | undefined>>({});
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lock Screen State
  const [masterPasswordInput, setMasterPasswordInput] = useState('');
  const [showMasterPassword, setShowMasterPassword] = useState(false);
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

  const handleServiceClick = (service: typeof POPULAR_SERVICES[0]) => {
    setName(service.name);
    setWebsite(`https://www.${service.url}`);
    setCategory(service.category);
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

  const groupedPasswords = useMemo(() => {
    const groups: Record<string, Password[]> = {};
    filteredPasswords.forEach(p => {
      const cat = p.category || 'Otros';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return groups;
  }, [filteredPasswords]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isLocked) {
    const isFirstTime = passwords.length === 0;

    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
              {isFirstTime ? <ShieldCheck className="h-10 w-10 text-primary" /> : <Lock className="h-10 w-10 text-primary" />}
            </div>
            <CardTitle className="text-2xl font-bold">
              {isFirstTime ? 'Configura tu Bóveda Segura' : 'Bóveda Bloqueada'}
            </CardTitle>
            <CardDescription className="text-base">
              {isFirstTime
                ? 'Tu seguridad es nuestra prioridad. Antes de empezar, necesitas crear una Llave Maestra.'
                : 'Introduce tu Contraseña Maestra para descifrar y acceder a tus contraseñas.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isFirstTime && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 mb-6 text-sm text-yellow-700 dark:text-yellow-200 rounded-r">
                <p className="font-bold mb-2">⚠️ Información Importante:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Esta contraseña será la <strong>única llave</strong> para ver tus datos.</li>
                  <li><strong>Solo tú la conoces</strong>. Nosotros no la guardamos.</li>
                  <li>Si la olvidas, <strong>perderás acceso</strong> a tus contraseñas para siempre.</li>
                  <li>Debes usar <strong>siempre la misma</strong> para entrar.</li>
                </ul>
              </div>
            )}

            <form onSubmit={handleUnlock} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="master-password">
                  {isFirstTime ? 'Crea tu Contraseña Maestra' : 'Contraseña Maestra'}
                </Label>
                <div className="relative">
                  <Input
                    id="master-password"
                    type={showMasterPassword ? "text" : "password"}
                    placeholder={isFirstTime ? "Elige una contraseña fuerte..." : "••••••••"}
                    value={masterPasswordInput}
                    onChange={(e) => setMasterPasswordInput(e.target.value)}
                    autoFocus
                    className="text-lg py-6 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowMasterPassword(!showMasterPassword)}
                  >
                    {showMasterPassword ? (
                      <EyeOff className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <Eye className="h-5 w-5 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              <Button type="submit" className="w-full py-6 text-lg" disabled={unlocking || !masterPasswordInput}>
                {unlocking ? 'Procesando...' : (isFirstTime ? 'Crear Bóveda y Acceder' : 'Desbloquear Bóveda')}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center text-xs text-muted-foreground text-center border-t pt-4 bg-muted/20">
            <p>Cifrado de extremo a extremo (AES-256) • Tu privacidad está garantizada</p>
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
        </CardHeader >
        <CardContent>
          {filteredPasswords.length > 0 ? (
            selectedCategory ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(null)} className="gap-1 pl-0 hover:bg-transparent hover:text-primary">
                    <ArrowLeft className="h-4 w-4" /> Volver
                  </Button>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    {(() => {
                      const Config = CATEGORY_CONFIG[selectedCategory] || CATEGORY_CONFIG['Otros'];
                      const Icon = Config.icon;
                      return <Icon className={`h-6 w-6 ${Config.color}`} />;
                    })()}
                    {selectedCategory}
                  </h2>
                </div>
                <ul className="space-y-3">
                  {(groupedPasswords[selectedCategory] || []).map(p => (
                    <li key={p.id} className="p-3 border rounded-md flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-accent/30 transition-colors gap-4">
                      <div className="flex items-start gap-3 flex-grow">
                        <Avatar className="h-10 w-10 rounded-md border bg-background">
                          <AvatarImage src={`https://logo.clearbit.com/${p.website || 'example.com'}`} alt={p.name} />
                          <AvatarImage src={`https://www.google.com/s2/favicons?domain=${p.website || 'example.com'}&sz=128`} alt={p.name} />
                          <AvatarFallback className="rounded-md bg-primary/10 text-primary font-bold">
                            {p.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-base">{p.name}</h3>
                          <div className="text-sm text-muted-foreground flex items-center flex-wrap gap-x-2">
                            <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> {p.username}</span>
                            <span className="text-muted-foreground/40 hidden sm:inline">|</span>
                            <div className="flex items-center gap-2 font-mono bg-muted/50 px-2 py-0.5 rounded text-xs">
                              <span>{visiblePasswords[p.id] || '••••••••'}</span>
                              <button onClick={() => handleTogglePasswordVisibility(p.id, p.passwordHash)} className="hover:text-primary transition-colors">
                                {visiblePasswords[p.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {p.website && (
                              <a href={p.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary hover:underline">
                                <Globe className="h-3 w-3" />
                                {(() => {
                                  try {
                                    return new URL(p.website).hostname.replace('www.', '');
                                  } catch {
                                    return p.website;
                                  }
                                })()}
                              </a>
                            )}
                            {p.device && <span className="flex items-center gap-1"><Smartphone className="h-3 w-3" /> {p.device}</span>}
                            {p.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {p.location}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 self-end sm:self-center ml-auto sm:ml-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopyPassword(p.passwordHash)} title="Copiar contraseña"><Copy className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(p)} title="Editar"><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteClick(p.id)} title="Eliminar"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(groupedPasswords).map(([category, items]) => {
                  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['Otros'];
                  const Icon = config.icon;
                  return (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`relative overflow-hidden p-6 rounded-xl border text-left transition-all hover:shadow-md hover:scale-[1.02] group bg-gradient-to-br ${config.gradient}`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-lg bg-background/80 backdrop-blur-sm shadow-sm ${config.color}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <span className="text-2xl font-bold opacity-20 group-hover:opacity-40 transition-opacity">{items.length}</span>
                      </div>
                      <h3 className="font-bold text-lg mb-1">{category}</h3>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        {items.length} {items.length === 1 ? 'Contraseña' : 'Contraseñas'}
                      </p>
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No tienes contraseñas guardadas.</p>
              <p className="text-sm">Añade tu primera contraseña para empezar.</p>
            </div>
          )}
        </CardContent>
      </Card >

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPassword ? 'Editar Contraseña' : 'Añadir Nueva Contraseña'}</DialogTitle>
            <DialogDescription>Completa los detalles para guardar una nueva contraseña de forma segura.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {!editingPassword && (
              <div className="space-y-3 mb-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Servicios Populares</Label>
                <div className="grid grid-cols-5 gap-2">
                  {POPULAR_SERVICES.map((service) => (
                    <button
                      key={service.name}
                      type="button"
                      onClick={() => handleServiceClick(service)}
                      className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-accent transition-colors group"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:scale-110 transition-transform ${service.color}`}>
                        {service.name.charAt(0)}
                      </div>
                      <span className="text-[10px] text-center leading-tight truncate w-full">{service.name}</span>
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">O rellena manualmente</span>
                  </div>
                </div>
              </div>
            )}
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
    </div >
  );
}
