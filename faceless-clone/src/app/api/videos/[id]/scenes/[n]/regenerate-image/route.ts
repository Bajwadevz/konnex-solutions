import { regenerateScene } from "@/server/handlers";
export const dynamic = "force-dynamic";
export const POST = (_req: Request, { params }: { params: { id: string; n: string } }) => regenerateScene(params.id, params.n);
