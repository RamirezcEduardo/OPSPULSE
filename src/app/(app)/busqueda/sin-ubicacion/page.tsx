import { DashboardBultos } from "../_bultos/Dashboard";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const { semana } = await searchParams;
  return <DashboardBultos clas="sin_ubicacion" titulo="Sin ubicación" semana={semana || undefined} />;
}
