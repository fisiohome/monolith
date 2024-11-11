import { Link, Head, usePage } from '@inertiajs/react'
import { Fragment } from 'react'
import UserDetail from './User'
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus } from 'lucide-react'
import type { GlobalPageProps } from '@/types/globals';
import type { User } from '@/types/user';
import type { ColumnDef } from "@tanstack/react-table"
import { DataTable } from '@/components/ui/data-table';
import { format } from 'date-fns';

export default function Index({ users }: { users: User[] }) {
  const { props: globalProps } = usePage<GlobalPageProps>()
  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "currentSignInAt",
      header: () => <div className="whitespace-nowrap">Current sign in at</div>,
      cell: ({ row }) => {
        const date = row.original.currentSignInAt
        const formattedDate = format(date, 'PPpp')

        return formattedDate
      }
    },
    {
      accessorKey: "lastSignInAt",
      header: () => <div className="whitespace-nowrap">Last sign in at</div>,
      cell: ({ row }) => {
        const date = row.original.lastSignInAt
        const formattedDate = format(date, 'PPpp')

        return formattedDate
      }
    },
    {
      accessorKey: "currentSignInIp",
      header: () => <div className="whitespace-nowrap">Current sign in IP</div>,
    },
    {
      accessorKey: "lastSignInIp",
      header: () => <div className="whitespace-nowrap">Last sign in IP</div>,
    },
    {
      accessorKey: "createdAt",
      header: "Created at",
    },
    {
      accessorKey: 'actions',
      header: '',
      cell: () => {
        return (<>
          actions
        </>)
      }
    }
  ]

  return (
    <>
      <Head title="Accounts" />
      <article className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
          <Button asChild>
            <Link href={globalProps.adminPortal.router.accountManagement.new}>
              <Plus />
              Add user
            </Link>
          </Button>
        </div>

        <div className="min-w-full">
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="suspended">Suspended</TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              <DataTable columns={columns} data={users} />
              {/* {users.map((user) => (
                <Fragment key={user.id}>
                  <p>
                    <Link
                      href={`admin/accounts/${user.id}`}
                      className="inline-block px-5 py-3 ml-2 font-medium bg-gray-100 rounded-lg"
                    >
                      Show this user
                    </Link>
                  </p>
                </Fragment>
              ))} */}
            </TabsContent>
            <TabsContent value="active">Change your password here.</TabsContent>
            <TabsContent value="suspended">Change your password here.</TabsContent>
          </Tabs>
        </div>
      </article>
    </>
  )
}
