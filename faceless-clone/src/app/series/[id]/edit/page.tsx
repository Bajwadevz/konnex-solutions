"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { SeriesWizard } from "@/components/series-wizard";
import { api } from "@/lib/client";
import type { SeriesWrite } from "@/lib/schemas";

export default function EditSeriesPage() {
  const params = useParams<{ id: string }>();
  const query = useQuery({ queryKey: ["series", params.id], queryFn: () => api<SeriesWrite & { id: string }>(`/api/series/${params.id}`) });
  if (!query.data) return <div className="skeleton h-96" />;
  const { id: _id, ...initial } = query.data;
  return <SeriesWizard mode="edit" seriesId={params.id} initial={initial} />;
}
