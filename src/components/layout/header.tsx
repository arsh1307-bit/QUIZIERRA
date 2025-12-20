'use client';
import Link from "next/link";
import { ClientThemeToggle } from "@/components/client-theme-toggle";
import { Logo } from "@/components/icons";
import { Button } from "../ui/button";
import { useUser } from "@/firebase";
import { signOut } from "firebase/auth";
import { useAuth } from "@/firebase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { LifeBuoy, LogOut, Menu, User as UserIcon, Bell, BookCopy, LayoutDashboard, Settings, Users, Shield, Pencil, Car } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../ui/sheet";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";

const mainNavLinks = [
  { href: "/#product", label: "Product" },
  { href: "/#features", label: "Features" },
  { href: "/#uses", label: "Uses" },
  { href: "/#faq", label: "FAQ" },
];

const dashboardNavItemsByRole: Record<UserRole, { href: string; icon: React.ElementType; label: string }[]> = {
    student: [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/dashboard/quizzes', icon: BookCopy, label: 'My Quizzes' },
        { href: '/dashboard/results', icon: BookCopy, label: 'Results' },
        { href: '/dashboard/racing', icon: Car, label: 'Racing' },
        { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
    ],
    instructor: [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/dashboard/quizzes', icon: BookCopy, label: 'Quizzes' },
        { href: '/dashboard/students', icon: Users, label: 'Students' },
        { href: '/dashboard/results', icon: BookCopy, label: 'Results' },
        { href: '/dashboard/racing', icon: Car, label: 'Racing' },
        { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
    ],
    admin: [
        { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/dashboard/users', icon: Users, label: 'Manage Users' },
        { href: '/dashboard/system', icon: Settings, label: 'System Settings' },
        { href: '/dashboard/billing', icon: Shield, label: 'Billing' },
        { href: '/dashboard/racing', icon: Car, label: 'Racing' },
    ],
};

export function Header({ isDashboard = false, userRole }: { isDashboard?: boolean, userRole?: UserRole }) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const handleSignOut = () => {
    if (auth) {
      signOut(auth);
    }
  };
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'Q';
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[1][0];
    }
    return names[0]?.[0] || 'U';
  }

  const navLinks = isDashboard && userRole ? dashboardNavItemsByRole[userRole] : mainNavLinks;

  const NavItems = ({ className }: { className?: string }) => {
    return (
      <nav className={className}>
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              pathname === link.href ? "text-primary" : "text-muted-foreground"
            )}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    )
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden mr-4">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-60">
            <SheetHeader>
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col space-y-6 pt-6">
              <Link href="/" className="flex items-center space-x-2" onClick={() => setIsMobileMenuOpen(false)}>
                <Logo className="h-6 w-6 text-primary" />
                <span className="font-bold font-headline">Quizierra</span>
              </Link>
              <NavItems className="flex flex-col items-start space-y-4" />
            </div>
          </SheetContent>
        </Sheet>
        
        <div className="mr-4 hidden md:flex items-center">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Logo className="h-6 w-6 text-primary" />
            <span className="font-bold font-headline">Quizierra</span>
          </Link>
          <NavItems className="items-center space-x-6" />
        </div>

        <div className="flex flex-1 items-center justify-end space-x-2">
          {isUserLoading ? (
            <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
          ) : user ? (
            <>
              {isDashboard && (
                 <Button variant="ghost" size="icon">
                  <Bell className="h-5 w-5" />
                  <span className="sr-only">Notifications</span>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                       <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                      <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.displayName}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => (window.location.href = '/dashboard')}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => (window.location.href = '/dashboard/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <LifeBuoy className="mr-2 h-4 w-4" />
                    <span>Support</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                     <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
             <nav className="hidden items-center space-x-2 md:flex">
              <Button variant="ghost" asChild>
                  <Link href="/login">Login</Link>
              </Button>
              <Button asChild>
                  <Link href="/signup">Sign Up</Link>
              </Button>
            </nav>
          )}
          <ClientThemeToggle />
        </div>
      </div>
    </header>
  );
}
