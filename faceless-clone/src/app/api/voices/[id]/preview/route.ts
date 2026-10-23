import { voicePreview } from "@/server/handlers";
export const dynamic = "force-dynamic";
export const GET = (req: Request, { params }: { params: { id: string } }) => voicePreview(req, params.id);
