import { retryVideo } from "@/server/handlers";
export const dynamic = "force-dynamic";
export const POST = (_req: Request, { params }: { params: { id: string } }) => retryVideo(params.id);
