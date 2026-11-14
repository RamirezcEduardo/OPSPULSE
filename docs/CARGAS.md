# Cargas de información — qué se necesita de cada archivo

Para cada carga necesito **un archivo de ejemplo real** (pueden ser 50–100 filas, sin datos personales) para fijar el mapeo exacto de columnas. Lo que sigue es lo que la app espera según el brief.

Leyenda: **[R]** obligatorio · [O] opcional · ❓ duda a confirmar.

## A. Maestros (se cargan primero; sin ellos no hay valor ni área)

| Carga | Archivo | Columnas que necesito | Clave / dedup | Dudas |
|---|---|---|---|---|
| VALOR | VALOR | Cod Alternat [R], Costo unitario [R], fecha de costo [O] | Cod Alternat (se actualiza) | ❓ ¿El costo cambia en el mes? ¿Desde qué fecha rige? |
| PRODUCTOS | PRODUCTOS / Proveedor | Cod Alternat [R], Descripción [R], Proveedor, Familia, Clase picking (ADAPTO/AFRAME/LACTEOS/AAA/OTROS), Caja estándar, Cód. barras | Cod Alternat | ❓ ¿Hay columna de marca o se toma la 1.ª palabra de la descripción? |
| UBICACIONES | UBICACIONES | Ubicación [R], Área [R], Piso, Pasillo, Módulo, ¿es virtual? | Ubicación | ❓ ¿Pasillo/módulo vienen en columnas o se sacan del código (EA-06-27-20-06)? |
| MOTIVOS | Motivos | Ubicación virtual → motivo (AJUSTE DROP, B2B…), área virtual; Pantalla → motivo para cód. 29 | tipo + clave | ❓ Lista completa de pantallas del cód. 29 |
| USUARIOS | USUARIOS | Usuario WMS [R], DNI, Nombre, Área, Supervisor | Usuario | — |
| AUDITORES | (manual en la app) | DNI, Nombre | DNI | — |

## B. Control de inventario

| Módulo | Archivo | Columnas | Filtros / reglas | Dedup |
|---|---|---|---|---|
| Bolsa – ERU | "Bolsa mes" A:T | Cód. actividad, Historial, Nro grupo, Cod Alternat, Ubicación, A ubicación, Fecha, Usuario creado, Usuario modif., Pantalla, Cód. razón, Nro tarea, Nro LPN, Un. orig, Un. ajuste | Cód. 17, 19, 29, 52, 53 | grupo+SKU+fecha+unid.+ubicación+LPN |
| Bolsa – SHORTPICK | DATA A:X | ídem + las columnas propias de shortpick | Solo cód. 4 y 17 | igual |
| Bolsa – Manual | (formulario en la app) | Fecha, grupo, SKU, monto, motivo, comentario | Incluye "DIFERENCIA VALORIZACION" | — |
| No considerar | Hoja de exclusiones actual | Nro grupo, Cod Alternat (vacío = grupo), Motivo, Comentario | — | grupo+SKU |
| Cruces | (se calcula desde Bolsa) | — | 17/19 ERU, CONSIDERAR, ±3 días | — |
| ERU / ERI | ❓ Archivo de conteo cíclico | Fecha, Ubicación, SKU, ¿contada?, ¿con error?, faltante, sobrante | — | fecha+ubicación+SKU |
| VAS | (sale de Bolsa: cód. 52 y CREA LPN VAS) | ❓ Origen del cartón y auditor: ¿de qué columna salen? | — | — |
| Merma | MERMA .xlsb | Fecha, Área, SKU, Descripción, Familia, Motivo, Unidades, Valor | — | ❓ clave única |
| Auditoría 5S | (formulario en la app) | 21 ítems: necesito el texto de cada ítem por S | — | — |
| Incidencias | Incidencias (histórico) + formulario | Fecha, DNI, Nombre, Área, Turno, Tipo, Proceso, SKU, Ubic. asignada, Unidad, Cantidad, LPN, ¿Ubicado?, Ubic. encontrada, ¿Devuelto?, Comentarios, fotos | — | ❓ |

## C. Control de búsqueda de incidencias

| Módulo | Archivo | Columnas | Reglas |
|---|---|---|---|
| Perdidos / Sin ubicación | CONTROL DE PROCESOS › Gestión Perdidos y Sin Ubicación (solo fuente) | Nro LPN [R], Proceso, SKU, Unidades, Valor, Fecha creación, Ubicación actual, Área, Supervisor, Responsable, DNI causó, Fecha levantamiento, DNI levantó, Acción | LPN que deja de figurar → "YA NO FIGURA – PONER FECHA" |
| Shortpick | ❓ | ❓ ¿Se hace seguimiento de búsqueda igual que perdidos? | ❓ |

## D. Seguimiento de operaciones

| Módulo | Archivo | Columnas | Reglas |
|---|---|---|---|
| Auditoría de reabasto | REABASTO.csv (diario) | Tarea, Orden, Tipo asignación, Estado, Cod Alternat, Descripción, Cantidad, LPN, Lote, Fecha venc., Ubic. destino, Área, Usuario, Fecha/hora | Solo Finalizada/Cancelado; clave Tarea\|LPN\|Cod\|UbicDestino; turno por hora |
| Recepción / Almacén / Picking / Despacho | ❓ | ❓ Archivo fuente, checklist y criterio de muestra | ❓ |

## Parámetros editables desde la app (tabla `parametro`)

- Muestra de reabasto: canceladas sí/no, máx. REAB-CONSOL-CAJA (5), aleatorias (25), máx. por usuario (3).
- Turnos: Mañana 7–15, Tarde 15–23, Noche.
- Cierres trimestrales oficiales (Q1–Q3).
- Cruces: ventana de días (±3), pesos de cercanía y de marca.
- Niveles 5S: Excelente ≥85, Bueno ≥70, Regular ≥50.
- Tramos de demora: 0-2 / 3-7 / 8-15 / 16-30 / >30.
