# Fuentes de datos (Google Drive · carpeta ADECCO2026)

| Módulo OpsPulse | Archivo / hoja | Columnas clave |
|---|---|---|
| Bolsa (ERU + shortpick) | CONTROL DE BOLSA › DATA | Historial de actividad, Nro LPN, Producto, Cod Alternat, Descripcion, Ubicacion, A ubicación, Fe y Hr Modif, Nro Grupo, Usuario creado, Usuario Modificac, Nombre pantalla, Fe y Hr Crea, Código de actividad, Cod Razon, Nro Tarea, Un Orig, Un Ajust, Fuente, TIPO, MOTIVO OP, Gestión |
| Control de búsqueda de incidencias › Shortpick | CONTROL DE SHORTPICK › DATA | ídem WMS + Estado, Nro Seq, Nro Orden (fechas en serial Excel) |
| No considerar | CONTROL DE BOLSA › NO CONSIDERAR | Nro Grupo, Cod Alternat, Motivo auditor, Comentario, Fecha registro |
| Ajustes manuales | CONTROL DE BOLSA › AJUSTES MANUALES | Fecha, Nro Grupo, Cod Alternat, Descripción, Ubicación, Cantidad, Monto S/, TIPO, MOTIVO OP, Comentario |
| Costo | CONTROL DE BOLSA › VALOR (A:C) | COD_PRODUCTO, PRODUCTO, COSTO |
| Producto / proveedor | CONTROL DE BOLSA › Proveedor | COD_PRODUCTO, PRODUCTO, DESC_PROV_PRC, DIVISION, LINEA, CATEGORIA, UMV, Tipo de almacen |
| Clase picking | CONTROL DE BOLSA › Proveedor (P:S) | ARTICULO, DESCRIPCION, CLASE (ADAPTO/AFRAME…) |
| Caja estándar | CONTROL DE PROCESOS › PRODUCTOS | Cod Alternat, Cantidad de caja estándar, Jerarquía 1–5 |
| Ubicaciones | CONTROL DE BOLSA › UBICACIONES | Ubicacion, UBI (ACTIVO/RESERVA), ubic_area, sub_area, AREA, PISO |
| Motivos virtuales / cód 29 | CONTROL DE BOLSA › Motivos (AC:AG) | Ubicación XX (cód 19) → Motivo OP; Pantalla creación (cód 29) → Motivo OP |
| ERU / ERI | ERU Consolidado 2026 › Base | Mes, Fecha, Semana, Tipo (UBI), Área, Subárea, Contadas, Con error |
| Control de búsqueda de incidencias › Perdidos / Sin ubicación | CONTROL DE PROCESOS › Gestión Perdidos y Sin Ubicación (solo como fuente; no es un módulo aparte. "Gestión Otros Procesos" no se migra) | Nro LPN, Proceso, Categoría, Cod Alternat, Unidades, Valor, Fecha creación LPN, Ubicación, DNI causó, Área, Supervisor, Estado, Fecha ingreso, Diagnóstico, Unidades encontradas/pendientes, FECHA DE LEVANTAMIENTO, DNI recuperó |
| Reabasto (carga) | AUDITORÍA DE REABASTO › CARGA | Export WMS: Producto, Cantidad asignada, Nro LPN, Fe y Hr Crea, Nro de lote, Fecha prioritaria, Cod Alternat, Nro Tarea, Ubic destino, Tipo Asignac, Estado de tarea… |
| Reabasto (auditoría) | AUDITORÍA DE REABASTO › AUDITORÍA | Clave, fechas, turno, motivo selección, P1–P6, cant. contada, hallazgo |
| Merma | EVOLUTIVO DE MERMA › DATA | Fecha, Ubicacion, lpn, Cod Alternat, Producto, lote, Cantidad actual, Área, Familia, Mes, Sem, Val tot |
| 5S | AUDITORÍA 5S · CD11 (Form + respuestas) | 21 ítems (ver src/lib/reglas/cincoS.ts) |
| Incidencias | REPORTE DE INCIDENCIAS POR ÁREA › Respuestas | DNI, Nombre, Área, Fecha, Turno, Tipo, Proceso, Cod Alternat, Ubic. asignada, Unidad, Cantidad, LPN/CJ, ¿Ubicaste?, Ubic. encontrada, Evidencia, ¿Devolviste?, Comentarios |

## Revisión de calidad de datos (14/11/2026)

| Fuente | Filas | Hallazgo | Tratamiento |
|---|---|---|---|
| ERU mensual (DATA ERU2026, ene–nov) | 1,246,528 | Cod Alternat limpio en los 11 meses. "Producto" (barras) en notación científica (7.50E+12). Texto con mojibake (`Recuento cÃ­clico`, `ID de instalaciÃ³n`). Fechas `d/m/aaaa h:mm` sin ceros (`1/11/2026 21:20`). | Se usa Cod Alternat; barras se ignora. Encabezados normalizados (se corrige mojibake). Parser de fechas d/m sin ceros. |
| ERU – códigos | — | Conteo: 37, 38, 41, 42 · Error ERU: 17, 19, 39, 40 · Bolsa: 17, 19, 29, 52 (53 no aparece en nov) · Se descartan: 4, 20, 21, 23, 25, 28, 43, 48, 51, 85 | Según hoja Parámetros del ERU y hoja Bolsa mes. |
| SHORTPICK mensual | ene 6,553 | **Enero: 6,519 de 6,553 Cod Alternat en notación científica (1.49E+05) → irrecuperable desde ese archivo.** Feb–nov limpios. Fechas `dd/mm/aaaa hh:mm:ss`. | Usar **CONTROL DE SHORTPICK › DATA** (17,846 filas ene–nov, Cod Alternat limpio, fechas en serial Excel). |
| VAS | — | Cartón = `Nro LPN` (BANSA…); auditor = `Usuario creado` (coincide con DATA_VAS). | — |
