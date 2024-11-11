import * as React from "react"
import { Fingerprint, HousePlus, Users } from "lucide-react"
import { NavMain } from "@/components/sidebar/nav-main"
import { NavUser } from "@/components/sidebar/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Link, usePage } from "@inertiajs/react"
import { useMemo } from 'react'
import type { GlobalPageProps } from "@/types/globals"

export default function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { props: globalProps, url: currentUrl } = usePage<GlobalPageProps>()
  const navUserProps = useMemo<React.ComponentProps<typeof NavUser>>(
    () => {
      const user = {
        name: 'Admin',
        email: globalProps.auth.currentUser?.email || '',
        avatar: ''
      }
      const url = { logout: globalProps.adminPortal.router.logout }

      return { user, url }
    },
    [globalProps.auth.currentUser?.email, globalProps.adminPortal.router.logout]
  )
  const navMainProps = useMemo<React.ComponentProps<typeof NavMain>>(
    () => {
      // const label = 'Users Management'
      const items = [
        {
          title: "User Management",
          url: '#',
          icon: Users,
          isActive: true,
          items: [
            {
              title: "Admin",
              url: '#',
              isActive: false
            },
            {
              title: "Physiotherapy",
              url: "#",
              isActive: false
            },
          ],
        },
        {
          title: "Account Management",
          url: globalProps.adminPortal.router.root,
          isActive: false,
          icon: Fingerprint
        }
      ].map(menu => {
        function isActiveLink(currentUrl: string, menuUrl: string) {
          return currentUrl === menuUrl || currentUrl.startsWith(menuUrl + '/');
        }
        const updatedMenu = { ...menu, isActive: false };

        if (menu.items && Array.isArray(menu.items)) {
          updatedMenu.items = menu.items.map(subItem => {
            const isActive = isActiveLink(currentUrl, subItem.url);
            if (isActive) {
              updatedMenu.isActive = true; // Set parent as active
            }
            return { ...subItem, isActive };
          });
        } else {
          updatedMenu.isActive = !!menu?.url && isActiveLink(currentUrl, menu.url)
        }

        return updatedMenu;
      })

      return { items }
    },
    [globalProps.adminPortal.router.accountManagement.index, currentUrl]
  )

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={globalProps.adminPortal.router.root}>
                <div className="flex items-center justify-center bg-purple-600 rounded-lg aspect-square size-8 text-sidebar-primary-foreground">
                  <HousePlus className="size-4" />
                </div>
                <div className="grid flex-1 text-sm leading-tight text-left">
                  <span className="font-semibold truncate">Fisiohome</span>
                  <span className="text-xs truncate">Admin Portal</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain {...navMainProps} />
        {/* <NavProjects projects={data.projects} /> */}
        {/* <NavSecondary items={data.navSecondary} className="mt-auto" /> */}
      </SidebarContent>
      <SidebarFooter>
        <NavUser {...navUserProps} />
      </SidebarFooter>
    </Sidebar>
  )
}
