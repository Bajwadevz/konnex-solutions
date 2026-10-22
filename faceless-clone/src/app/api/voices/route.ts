import { listVoices } from "@/server/handlers";
export const dynamic = "force-dynamic";
export const GET = (req: Request) => listVoices(req);
