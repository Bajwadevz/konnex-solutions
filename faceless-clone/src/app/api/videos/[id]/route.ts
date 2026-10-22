import { deleteVideo, getVideo, patchVideo } from "@/server/handlers";
export const dynamic = "force-dynamic";
export const GET = (_req: Request, { params }: { params: { id: string } }) => getVideo(params.id);
export const PATCH = (req: Request, { params }: { params: { id: string } }) => patchVideo(req, params.id);
export const DELETE = (_req: Request, { params }: { params: { id: string } }) => deleteVideo(params.id);
