export type Rol = "admin" | "auditor" | "supervisor" | "lectura";
export const ROLES: Record<Rol, string> = {
  admin: "Administrador",
  auditor: "Auditor",
  supervisor: "Supervisor",
  lectura: "Lectura (gerencia)",
};
