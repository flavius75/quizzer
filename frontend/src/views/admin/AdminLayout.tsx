import { Outlet } from "react-router"
import { AppSidebar } from "@/components/app-sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"
  import { ChevronDown } from "lucide-react";
  import { useAuthStore } from "@/store/authStore";
    import { useNavigate } from "react-router";
    import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function AdminLayout() {

    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
  
    const handleLogout = async () => {
      await logout();
      navigate("/");
    };

    return(
        <>
             <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                <header className="flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4">
    <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
            <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="#">
                        Building Your Application
                    </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                    <BreadcrumbPage>Data Fetching</BreadcrumbPage>
                </BreadcrumbItem>
            </BreadcrumbList>
        </Breadcrumb>
    </div>
    <div className="flex items-center gap-4">
        <h2>Hello {user?.username}</h2>
        <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>CN</AvatarFallback>
        </Avatar>
        <DropdownMenu>
            <DropdownMenuTrigger><ChevronDown /></DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/")}>Quizzes</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/user/leaderboard")}>Leaderboard</DropdownMenuItem>
                {user?.user_role == "admin" && 
                <DropdownMenuItem onClick={() => navigate("/admin/dashboard")}>Administration</DropdownMenuItem>
                }
                <DropdownMenuItem onClick={handleLogout}>Log Out</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    </div>
</header>                   
                    <Outlet />
                </SidebarInset>
                </SidebarProvider>

        </>
    )
}