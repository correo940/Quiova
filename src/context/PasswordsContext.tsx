'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import AES from 'crypto-js/aes';
import Utf8 from 'crypto-js/enc-utf8';
import PBKDF2 from 'crypto-js/pbkdf2';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/apps/mi-hogar/auth-context';
import { toast } from 'sonner';

// 1. Definir la estructura de una contraseña
export interface Password {
  id: string;
  name: string;
  username: string;
  passwordHash: string; // Contraseña cifrada
  website?: string;
  category: string;
  device?: string;
  location?: string;
  createdAt: string;
}

export type PasswordInput = Omit<Password, 'id' | 'createdAt' | 'passwordHash'> & { password: string };

// 2. Definir el contexto
interface PasswordsContextType {
  passwords: Password[];
  loading: boolean;
  isLocked: boolean;
  unlock: (masterPassword: string) => Promise<boolean>;
  lock: () => void;
  addPassword: (data: PasswordInput) => Promise<void>;
  updatePassword: (id: string, data: PasswordInput) => Promise<void>;
  deletePassword: (id: string) => Promise<void>;
  decryptPassword: (hash: string) => string;
  importPasswords: (passwords: Password[]) => Promise<void>;
}

const PasswordsContext = createContext<PasswordsContextType | undefined>(undefined);

// 3. Crear el proveedor de contexto
export function PasswordsProvider({ children }: { children: React.ReactNode }) {
  const [passwords, setPasswords] = useState<Password[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(true);
  const [encryptionKey, setEncryptionKey] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchPasswords();
    } else {
      setPasswords([]);
      setLoading(false);
      setIsLocked(true);
      setEncryptionKey(null);
    }
  }, [user]);

  const deriveKey = (masterPassword: string, salt: string) => {
    // PBKDF2 key derivation
    // 1000 iterations, 256-bit key
    const derived = PBKDF2(masterPassword, salt, {
      keySize: 256 / 32,
      iterations: 1000
    });
    return derived.toString();
  };

  const unlock = async (masterPassword: string) => {
    if (!user) return false;
    try {
      // Derive key using user ID as salt
      const key = deriveKey(masterPassword, user.id);

      // Verify key by attempting to decrypt a known value or simply setting it
      // Since we don't have a "check" value stored, we'll assume it's correct
      // and if decryption fails later, it means the password was wrong for that entry.
      // Ideally, we would store a hash of the master password or a challenge to verify.
      // For now, we will set the key and unlock.

      setEncryptionKey(key);
      setIsLocked(false);
      return true;
    } catch (e) {
      console.error('Error unlocking:', e);
      return false;
    }
  };

  const lock = () => {
    setIsLocked(true);
    setEncryptionKey(null);
  };

  const fetchPasswords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('passwords')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map Supabase fields to Password interface
      const mappedPasswords: Password[] = data.map((item: any) => ({
        id: item.id,
        name: item.name,
        username: item.username || '',
        passwordHash: item.password_hash,
        website: item.website,
        category: item.category || '',
        device: item.device,
        location: item.location,
        createdAt: item.created_at,
      }));

      setPasswords(mappedPasswords);
    } catch (error) {
      console.error('Error fetching passwords:', error);
      toast.error('Error al cargar las contraseñas');
    } finally {
      setLoading(false);
    }
  };

  const addPassword = async (data: PasswordInput) => {
    if (!user || !encryptionKey) {
      toast.error('La bóveda está bloqueada');
      return;
    }

    const passwordHash = AES.encrypt(data.password, encryptionKey).toString();

    try {
      const { data: newPassword, error } = await supabase
        .from('passwords')
        .insert([
          {
            user_id: user.id,
            name: data.name,
            username: data.username,
            password_hash: passwordHash,
            website: data.website,
            category: data.category,
            device: data.device,
            location: data.location,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      const mappedPassword: Password = {
        id: newPassword.id,
        name: newPassword.name,
        username: newPassword.username || '',
        passwordHash: newPassword.password_hash,
        website: newPassword.website,
        category: newPassword.category || '',
        device: newPassword.device,
        location: newPassword.location,
        createdAt: newPassword.created_at,
      };

      setPasswords([mappedPassword, ...passwords]);
      toast.success('Contraseña guardada cifrada');
    } catch (error) {
      console.error('Error adding password:', error);
      toast.error('Error al guardar la contraseña');
      throw error;
    }
  };

  const updatePassword = async (id: string, data: PasswordInput) => {
    if (!encryptionKey) {
      toast.error('La bóveda está bloqueada');
      return;
    }

    const passwordHash = AES.encrypt(data.password, encryptionKey).toString();

    try {
      const { error } = await supabase
        .from('passwords')
        .update({
          name: data.name,
          username: data.username,
          password_hash: passwordHash,
          website: data.website,
          category: data.category,
          device: data.device,
          location: data.location,
        })
        .eq('id', id);

      if (error) throw error;

      setPasswords(passwords.map(p =>
        p.id === id
          ? {
            ...p,
            ...data,
            passwordHash,
          }
          : p
      ));
      toast.success('Contraseña actualizada');
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Error al actualizar la contraseña');
      throw error;
    }
  };

  const deletePassword = async (id: string) => {
    try {
      const { error } = await supabase
        .from('passwords')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPasswords(passwords.filter(p => p.id !== id));
      toast.success('Contraseña eliminada');
    } catch (error) {
      console.error('Error deleting password:', error);
      toast.error('Error al eliminar la contraseña');
      throw error;
    }
  };

  const importPasswords = async (importedPasswords: Password[]) => {
    if (!user) return;

    try {
      const passwordsToInsert = importedPasswords.map(p => ({
        user_id: user.id,
        name: p.name,
        username: p.username,
        password_hash: p.passwordHash,
        website: p.website,
        category: p.category,
        device: p.device,
        location: p.location,
      }));

      const { data, error } = await supabase
        .from('passwords')
        .insert(passwordsToInsert)
        .select();

      if (error) throw error;

      fetchPasswords();
      toast.success('Contraseñas importadas');
    } catch (error) {
      console.error('Error importing passwords:', error);
      toast.error('Error al importar contraseñas');
      throw error;
    }
  };

  const decryptPassword = (hash: string) => {
    if (!encryptionKey) return '';
    try {
      const bytes = AES.decrypt(hash, encryptionKey);
      return bytes.toString(Utf8);
    } catch (e) {
      return '';
    }
  };

  const value = {
    passwords,
    loading,
    isLocked,
    unlock,
    lock,
    addPassword,
    updatePassword,
    deletePassword,
    decryptPassword,
    importPasswords,
  };

  return <PasswordsContext.Provider value={value}>{children}</PasswordsContext.Provider>;
}

// 4. Hook para usar el contexto
export function usePasswords() {
  const context = useContext(PasswordsContext);
  if (context === undefined) {
    throw new Error('usePasswords must be used within a PasswordsProvider');
  }
  return context;
}
