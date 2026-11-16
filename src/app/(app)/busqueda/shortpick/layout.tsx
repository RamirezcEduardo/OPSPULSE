import { TabsSeccion } from "@/components/TabsSeccion";
export default function L({ children }: { children: React.ReactNode }) {
  return (<><TabsSeccion base="/busqueda/shortpick" /> {children}</>);
}
