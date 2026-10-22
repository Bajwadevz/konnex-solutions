import { listAccounts } from "@/server/handlers";
export const dynamic = "force-dynamic";
export const GET = () => listAccounts();
