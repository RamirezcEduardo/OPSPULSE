import { DashboardBultos } from "../_bultos/Dashboard";
export const dynamic = "force-dynamic";
export default async function Page({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const { semana } = await searchParams;
  return <DashboardBultos clas="perdidos" titulo="Perdidos" semana={semana || undefined} />;
}
