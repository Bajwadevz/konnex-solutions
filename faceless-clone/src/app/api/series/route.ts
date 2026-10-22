import { createSeries, listSeries } from "@/server/handlers";
export const dynamic = "force-dynamic";
export const GET = () => listSeries();
export const POST = (req: Request) => createSeries(req);
