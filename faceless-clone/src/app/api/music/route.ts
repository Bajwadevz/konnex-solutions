import { listMusic, uploadMusic } from "@/server/handlers";
export const dynamic = "force-dynamic";
export const GET = () => listMusic();
export const POST = (req: Request) => uploadMusic(req);
