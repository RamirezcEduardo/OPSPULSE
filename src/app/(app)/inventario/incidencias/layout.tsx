import { TabsSeccion } from "@/components/TabsSeccion";
export default function L({ children }: { children: React.ReactNode }) {
  return (<><TabsSeccion base="/inventario/incidencias" primera="Dashboard" segunda="Registrar" ruta="registrar" /> {children}</>);
}
