/** Supabase Auth exige un correo: cada usuario se guarda como <usuario>@opspulse.local (correo interno, no se usa para enviar nada). */
export const DOMINIO_INTERNO = "opspulse.local";
export const normalizarUsuario = (u: string) => u.trim().toLowerCase().replace(/\s+/g, "");
export const usuarioAEmail = (u: string) => `${normalizarUsuario(u)}@${DOMINIO_INTERNO}`;
export const emailAUsuario = (e: string) => e.replace(`@${DOMINIO_INTERNO}`, "");
export const usuarioValido = (u: string) => /^[a-z0-9._-]{3,40}$/.test(normalizarUsuario(u));
