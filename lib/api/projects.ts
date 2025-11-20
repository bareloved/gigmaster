import { createClient } from "@/lib/supabase/client";
import type { Project, ProjectInsert, ProjectUpdate } from "@/lib/types/shared";

export async function createProject(data: Omit<ProjectInsert, "id" | "created_at" | "updated_at" | "owner_id">) {
  const supabase = createClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) throw new Error(`Authentication failed: ${authError.message}`);
  if (!user) throw new Error("Not authenticated. Please sign in again.");

  const { data: project, error } = await supabase
    .from("projects")
    .insert({ ...data, owner_id: user.id })
    .select()
    .single();

  if (error) throw new Error(error.message || "Failed to create project");
  return project;
}

export async function listUserProjects() {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: projects, error } = await supabase
    .from("projects")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message || "Failed to fetch projects");
  return projects || [];
}

export async function getProject(projectId: string) {
  const supabase = createClient();

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error) throw new Error(error.message || "Failed to fetch project");
  return project;
}

export async function updateProject(projectId: string, data: ProjectUpdate) {
  const supabase = createClient();

  const { data: project, error } = await supabase
    .from("projects")
    .update(data)
    .eq("id", projectId)
    .select()
    .single();

  if (error) throw new Error(error.message || "Failed to update project");
  return project;
}

export async function deleteProject(projectId: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);

  if (error) throw new Error(error.message || "Failed to delete project");
}
