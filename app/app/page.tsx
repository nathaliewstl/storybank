import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StoryBoard, { type Story } from "@/components/StoryBoard";

export const metadata: Metadata = { title: "My stories — StoryBank" };

export default async function AppPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .order("created_at", { ascending: false });

  return <StoryBoard initialStories={(data as Story[]) ?? []} loadError={error?.message ?? null} />;
}
