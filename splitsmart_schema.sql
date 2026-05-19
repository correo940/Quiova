-- Eliminar tablas anteriores si existen
DROP TABLE IF EXISTS splitsmart_gastos;
DROP TABLE IF EXISTS splitsmart_miembros;
DROP TABLE IF EXISTS splitsmart_grupos;

-- 1. Tabla de Grupos
CREATE TABLE splitsmart_grupos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  emoji TEXT DEFAULT '💸',
  divisa_base TEXT DEFAULT 'EUR',
  presupuesto_maximo NUMERIC DEFAULT 0,
  presupuesto_alerta NUMERIC DEFAULT 75,
  cerrado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de Miembros
CREATE TABLE splitsmart_miembros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  grupo_id UUID REFERENCES splitsmart_grupos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  user_id UUID, -- Opcional, para enlazar a auth.users de Supabase
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla de Gastos
CREATE TABLE splitsmart_gastos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  grupo_id UUID REFERENCES splitsmart_grupos(id) ON DELETE CASCADE,
  pagador_id UUID REFERENCES splitsmart_miembros(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  monto NUMERIC NOT NULL,
  divisa TEXT DEFAULT 'EUR',
  categoria TEXT DEFAULT 'otros',
  fecha DATE DEFAULT CURRENT_DATE,
  ubicacion TEXT, -- String con el código de la ciudad o coordenadas
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS) pero permitir acceso público de momento (hasta que implementes Auth)
ALTER TABLE splitsmart_grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE splitsmart_miembros ENABLE ROW LEVEL SECURITY;
ALTER TABLE splitsmart_gastos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir acceso anon a grupos" ON splitsmart_grupos FOR ALL USING (true);
CREATE POLICY "Permitir acceso anon a miembros" ON splitsmart_miembros FOR ALL USING (true);
CREATE POLICY "Permitir acceso anon a gastos" ON splitsmart_gastos FOR ALL USING (true);
