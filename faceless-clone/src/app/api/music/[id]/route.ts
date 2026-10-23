import { deleteMusic } from "@/server/handlers";
export const dynamic = "force-dynamic";
export const DELETE = (_req: Request, { params }: { params: { id: string } }) => deleteMusic(params.id);
