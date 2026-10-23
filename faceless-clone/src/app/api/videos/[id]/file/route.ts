import { videoFile } from "@/server/handlers";
export const dynamic = "force-dynamic";
export const GET = (req: Request, { params }: { params: { id: string } }) => videoFile(req, params.id);
