import { bulkVideos, listVideos } from "@/server/handlers";
export const dynamic = "force-dynamic";
export const GET = (req: Request) => listVideos(req);
export const POST = (req: Request) => bulkVideos(req);
