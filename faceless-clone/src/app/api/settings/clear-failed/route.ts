import { clearFailedJobs } from "@/server/handlers";
export const dynamic = "force-dynamic";
export const POST = () => clearFailedJobs();
