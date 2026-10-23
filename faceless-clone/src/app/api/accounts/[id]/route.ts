import { deleteAccount } from "@/server/handlers";
export const dynamic = "force-dynamic";
export const DELETE = (_req: Request, { params }: { params: { id: string } }) => deleteAccount(params.id);
