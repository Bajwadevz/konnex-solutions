import { startAuth } from "@/server/handlers";
export const dynamic = "force-dynamic";
export const GET = (req: Request, { params }: { params: { platform: string } }) => startAuth(params.platform, req);
