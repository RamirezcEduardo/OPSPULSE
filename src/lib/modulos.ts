export type Nivel = "ninguno" | "ver" | "registrar" | "editar";
export const NIVELES: { v: Nivel; t: string }[] = [
  { v: "ninguno", t: "Sin acceso" }, { v: "ver", t: "Ver" }, { v: "registrar", t: "Registrar" }, { v: "editar", t: "Editar / cargar" },
];
export const ORDEN: Record<Nivel, number> = { ninguno: 0, ver: 1, registrar: 2, editar: 3 };

export const GRUPOS: { titulo: string; items: { href: string; label: string }[] }[] = [
  { titulo: "Control de inventario", items: [
    { href: "/inventario/bolsa", label: "Bolsa de inventario" },
    { href: "/inventario/cruces", label: "Posibles cruces de bolsa" },
    { href: "/inventario/vas", label: "VAS" },
    { href: "/inventario/merma", label: "Merma" },
    { href: "/inventario/5s", label: "Auditoría 5S" },
    { href: "/inventario/incidencias", label: "Incidencias" },
    { href: "/inventario/shortpick", label: "Shortpick" },
    { href: "/inventario/eru", label: "ERU / ERI" },
  ] },
  { titulo: "Seguimiento de operaciones", items: [
    { href: "/operaciones/recepcion", label: "Auditoría de recepción" },
    { href: "/operaciones/almacen", label: "Auditoría de almacén" },
    { href: "/operaciones/reabasto", label: "Auditoría de reabasto" },
    { href: "/operaciones/picking", label: "Auditoría de picking" },
    { href: "/operaciones/despacho", label: "Auditoría de despacho" },
  ] },
  { titulo: "Control de búsqueda de incidencias", items: [
    { href: "/busqueda/perdidos", label: "Perdidos" },
    { href: "/busqueda/sin-ubicacion", label: "Sin ubicación" },
    { href: "/busqueda/shortpick", label: "Shortpick" },
  ] },
  { titulo: "Otros", items: [{ href: "/cargas", label: "Cargas y correcciones" }] },
];
export const MODULOS = GRUPOS.flatMap((g) => g.items);

/** Módulo al que pertenece una ruta (el href más largo que sea prefijo). */
export const moduloDe = (path: string) =>
  MODULOS.filter((m) => path === m.href || path.startsWith(m.href + "/")).sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;

/** Pantallas de registro (formularios móviles) dentro de un módulo. */
export const esRegistro = (path: string) => /\/(buscar|validar|auditar|registrar)(\/|$)/.test(path);
