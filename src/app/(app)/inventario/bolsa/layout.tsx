import { TabsSeccion } from "@/components/TabsSeccion";
export default function L({ children }: { children: React.ReactNode }) {
  return (<><TabsSeccion base="/inventario/bolsa" primera="Dashboard" segunda="Neteos" ruta="neteos" />{children}</>);
}
