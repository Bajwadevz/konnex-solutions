import { testProvider } from "@/server/handlers";
export const dynamic = "force-dynamic";
export const POST = (_req: Request, { params }: { params: { name: string } }) => testProvider(params.name);
