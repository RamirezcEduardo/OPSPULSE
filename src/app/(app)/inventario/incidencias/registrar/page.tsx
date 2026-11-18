import { FormIncidencia } from "./Form";
export default function Registrar() {
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-3">
      <h1 className="text-xl font-extrabold">Registrar incidencia</h1>
      <FormIncidencia hoy={hoy} />
    </div>
  );
}
