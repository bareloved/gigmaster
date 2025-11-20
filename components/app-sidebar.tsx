"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  DollarSign,
  User,
  LogOut,
  ChevronRight,
  Plus,
  Users,
  History,
  Calendar,
  Settings,
  Music,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/providers/user-provider";
import { getInitials, getUserDisplayName } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { listUserProjects } from "@/lib/api/projects";

// Menu items (non-projects, non-dashboard, non-my-circle)
// Order: All Gigs, Money, Calendar, History
const navItems = [
  {
    title: "All Gigs",
    href: "/gigs",
    icon: Music,
  },
  {
    title: "Money",
    href: "/money",
    icon: DollarSign,
  },
  {
    title: "Calendar",
    href: "/calendar",
    icon: Calendar,
  },
  {
    title: "History",
    href: "/history",
    icon: History,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile } = useUser();

  // Fetch user's projects
  const { data: projects = [], isLoading: isProjectsLoading } = useQuery({
    queryKey: ["projects", user?.id],
    queryFn: listUserProjects,
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch gig counts for all projects
  const { data: gigCounts = {} } = useQuery({
    queryKey: ["project-gig-counts", user?.id],
    queryFn: async () => {
      const supabase = createClient();
      const counts: Record<string, number> = {};
      
      // Fetch gig counts for all user projects
      for (const project of projects) {
        const { count, error } = await supabase
          .from("gigs")
          .select("*", { count: "exact", head: true })
          .eq("project_id", project.id);
        
        if (!error && count !== null) {
          counts[project.id] = count;
        }
      }
      
      return counts;
    },
    enabled: !!user && projects.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/sign-in");
    router.refresh();
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <span className="text-xl">🎵</span>
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Ensemble</span>
                  <span className="text-xs text-muted-foreground">Gig Brain</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Dashboard */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/dashboard"}>
                  <Link href="/dashboard" prefetch={false}>
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* All Gigs */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/gigs"}>
                  <Link href="/gigs" prefetch={false}>
                    <Music />
                    <span>All Gigs</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Money */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/money"}>
                  <Link href="/money" prefetch={false}>
                    <DollarSign />
                    <span>Money</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Calendar */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/calendar"}>
                  <Link href="/calendar" prefetch={false}>
                    <Calendar />
                    <span>Calendar</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* My Circle */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/my-circle"}>
                  <Link href="/my-circle" prefetch={false}>
                    <Users />
                    <span>My Circle</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* History */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/history"}>
                  <Link href="/history" prefetch={false}>
                    <History />
                    <span>History</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Divider */}
              <SidebarSeparator />

              {/* Projects - Collapsible */}
              <Collapsible defaultOpen className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton 
                      isActive={pathname.startsWith("/projects")}
                      tooltip="Projects"
                    >
                      <FolderKanban />
                      <span>Projects</span>
                      <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {isProjectsLoading ? (
                        // Loading state
                        <>
                          <SidebarMenuSubItem>
                            <Skeleton className="h-8 w-full" />
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <Skeleton className="h-8 w-full" />
                          </SidebarMenuSubItem>
                        </>
                      ) : projects.length === 0 ? (
                        // Empty state
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <Link href="/projects">
                              <Plus className="h-4 w-4" />
                              <span className="text-muted-foreground">Create project</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ) : (
                        // Projects list
                        <>
                          {projects.map((project) => (
                            <SidebarMenuSubItem key={project.id}>
                              <SidebarMenuSubButton 
                                asChild
                                isActive={pathname === `/projects/${project.id}`}
                              >
                                <Link href={`/projects/${project.id}`} className="flex items-center justify-between w-full">
                                  <span>{project.name}</span>
                                  {gigCounts[project.id] !== undefined && (
                                    <span className="ml-auto text-xs text-muted-foreground">
                                      {gigCounts[project.id]}
                                    </span>
                                  )}
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                          {/* View all projects */}
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton asChild size="sm">
                              <Link href="/projects">
                                <span>View all</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </>
                      )}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" alt={user?.email || "User"} />
                    <AvatarFallback>
                      {getInitials(profile?.name || user?.user_metadata?.name, user?.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="text-sm font-medium">
                      {getUserDisplayName(profile, user)}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {user?.email}
                    </span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {getUserDisplayName(profile, user)}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" prefetch={false}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings/calendar" prefetch={false}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  );
}
