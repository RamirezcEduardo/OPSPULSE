/**
 * Datos públicos del proyecto Supabase (seguros en el navegador: la seguridad la dan RLS y los roles).
 * Se pueden reemplazar con variables de entorno. La llave secreta NUNCA va aquí.
 */
export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qbbedvqgjywiwfnqfbfy.supabase.co";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Mn-6xJpGyoILfAa8WKv3Ow_v7jiU8rH";
