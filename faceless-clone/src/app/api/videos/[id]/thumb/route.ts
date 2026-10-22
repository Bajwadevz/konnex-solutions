import { videoThumb } from "@/server/handlers";
export const dynamic = "force-dynamic";
export const GET = (_req: Request, { params }: { params: { id: string } }) => videoThumb(params.id);
