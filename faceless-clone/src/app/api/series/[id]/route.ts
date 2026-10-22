import { deleteSeries, getSeries, patchSeries } from "@/server/handlers";
export const dynamic = "force-dynamic";
export const GET = (req: Request, { params }: { params: { id: string } }) => getSeries(req, params.id);
export const PATCH = (req: Request, { params }: { params: { id: string } }) => patchSeries(req, params.id);
export const DELETE = (_req: Request, { params }: { params: { id: string } }) => deleteSeries(params.id);
