import { artPreview } from "@/server/handlers";
export const dynamic = "force-dynamic";
export const GET = (_req: Request, { params }: { params: { key: string } }) => artPreview(params.key);
