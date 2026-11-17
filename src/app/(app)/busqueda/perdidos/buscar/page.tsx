import { BuscarBultosPage } from "../../_bultos/BuscarPage";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const { semana } = await searchParams;
  return <BuscarBultosPage clas="perdidos" titulo="Búsqueda · Perdidos" semana={semana || undefined} />;
}
