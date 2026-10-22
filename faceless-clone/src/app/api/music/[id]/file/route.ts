import { musicFile } from "@/server/handlers";
export const dynamic = "force-dynamic";
export const GET = (_req: Request, { params }: { params: { id: string } }) => musicFile(params.id);
