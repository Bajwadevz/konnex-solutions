import { generateForSeries } from "@/server/handlers";
export const dynamic = "force-dynamic";
export const POST = (req: Request, { params }: { params: { id: string } }) => generateForSeries(req, params.id);
