import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import type { TableRowDataProps } from "@/pages/AdminPortal/Admin/Index"
import { format } from "date-fns/format"
import { Fingerprint, Pencil, Trash2 } from "lucide-react"
import { usePage } from "@inertiajs/react"
import { useMemo, type ComponentProps } from "react"
import type { GlobalPageProps } from "@/types/globals"

interface ExpandSubTableProps extends ComponentProps<'div'> {
  row: TableRowDataProps
  isSuperAdmin: boolean
  handleDelete: (row: TableRowDataProps) => void
}

export default function ExpandSubTable({ row, isSuperAdmin, handleDelete }: ExpandSubTableProps) {
  const { props: globalProps } = usePage<GlobalPageProps>()

  const isShowDelete = useMemo(() =>
    isSuperAdmin && (globalProps.auth.currentUser?.user.email !== row.original.user.email),
    [isSuperAdmin, globalProps.auth.currentUser?.user.email, row.original.user.email]
  )

  return (
    <>
      <div className='grid w-full grid-cols-3 gap-4'>
        <div className='space-y-1'>
          <p className='text-xs text-muted-foreground'>Created Date</p>
          <p className='font-semibold'>{format(row.original.createdAt, 'PPP')}</p>
        </div>
        <div className='space-y-1'>
          <p className='text-xs text-muted-foreground'>Last updated</p>
          <p className='font-semibold'>{format(row.original.updatedAt, 'PPpp')}</p>
        </div>
        {isSuperAdmin && row.original.user['isOnline?'] && (
          <div className='space-y-1'>
            <p className='text-xs text-muted-foreground'>Current IP</p>
            <p className='font-semibold'>{row?.original?.user?.currentSignInIp || '-'}</p>
          </div>
        )}
        {isSuperAdmin && (
          <>
            <div className='space-y-1'>
              <p className='text-xs text-muted-foreground'>Last IP</p>
              <p className='font-semibold'>{row?.original?.user?.lastSignInIp || '-'}</p>
            </div>
            <div className='space-y-1'>
              <p className='text-xs text-muted-foreground'>Last Sign In</p>
              <p className='font-semibold'>
                {row?.original?.user?.lastSignInAt ? format(row?.original?.user?.lastSignInAt, 'PPpp') : '-'}
              </p>
            </div>
          </>
        )}
      </div>

      <div className='flex items-center justify-end space-x-2'>
        <Button variant="outline" disabled>
          <Pencil />
          Edit
        </Button>

        <Button variant="outline" disabled>
          <Fingerprint />
          Change Password
        </Button>

        {isShowDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action is irreversible. Deleting your account will permanently remove all associated data from our servers and cannot be recovered.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep Account</AlertDialogCancel>
                <Button
                  variant='destructive'
                  onClick={() => handleDelete(row)}
                >
                  Delete
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </>
  )
} 