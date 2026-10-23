import { patchSettings, settingsOverview } from "@/server/handlers";
export const dynamic = "force-dynamic";
export const GET = () => settingsOverview();
export const PATCH = (req: Request) => patchSettings(req);
