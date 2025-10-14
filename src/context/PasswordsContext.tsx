'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import AES from 'crypto-js/aes';
import Utf8 from 'crypto-js/enc-utf8';

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

// ¡¡¡ADVERTENCIA DE SEGURIDAD!!!
// Esta clave es solo para desarrollo. En una aplicación real y sofisticada,
// esta clave NUNCA debe estar hardcodeada. Debería derivarse de una
// contraseña maestra que solo el usuario conoce.
const SECRET_KEY = 'esto-es-un-secreto-muy-largo-y-seguro';

// 2. Definir el contexto
interface PasswordsContextType {
  passwords: Password[];
  addPassword: (data: PasswordInput) => void;
  updatePassword: (id: string, data: PasswordInput) => void;
  deletePassword: (id: string) => void;
  decryptPassword: (hash: string) => string;
  importPasswords: (passwords: Password[]) => void;
}

const PasswordsContext = createContext<PasswordsContextType | undefined>(undefined);

// 3. Crear el proveedor de contexto
export function PasswordsProvider({ children }: { children: React.ReactNode }) {
  const [passwords, setPasswords] = useState<Password[]>([]);

  useEffect(() => {
    const storedPasswords = localStorage.getItem('passwords');
    if (storedPasswords) {
      setPasswords(JSON.parse(storedPasswords));
    }
  }, []);

  const savePasswords = (newPasswords: Password[]) => {
    setPasswords(newPasswords);
    localStorage.setItem('passwords', JSON.stringify(newPasswords));
  };

  const addPassword = (data: PasswordInput) => {
    const passwordHash = AES.encrypt(data.password, SECRET_KEY).toString();
    const newPassword: Password = {
      ...data,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      passwordHash,
    };
    savePasswords([...passwords, newPassword]);
  };

  const updatePassword = (id: string, data: PasswordInput) => {
    const passwordHash = AES.encrypt(data.password, SECRET_KEY).toString();
    const updatedPasswords = passwords.map(p => 
      p.id === id ? { ...p, ...data, passwordHash } : p
    );
    savePasswords(updatedPasswords);
  };

  const deletePassword = (id: string) => {
    const filteredPasswords = passwords.filter(p => p.id !== id);
    savePasswords(filteredPasswords);
  };

  const importPasswords = (importedPasswords: Password[]) => {
    const passwordsMap = new Map<string, Password>();
    passwords.forEach(p => passwordsMap.set(p.id, p));
    importedPasswords.forEach(p => passwordsMap.set(p.id, p));
    const mergedPasswords = Array.from(passwordsMap.values());
    savePasswords(mergedPasswords);
  };

  const decryptPassword = (hash: string) => {
    const bytes = AES.decrypt(hash, SECRET_KEY);
    return bytes.toString(Utf8);
  };

  const value = {
    passwords,
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
