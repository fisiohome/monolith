import { Link, Head } from '@inertiajs/react'
import Admin from './Admin'

export default function Show({ admin, flash }: any) {
  const onDestroy = (e) => {
    if (!confirm('Are you sure you want to delete this admin?')) {
      e.preventDefault()
    }
  }

  return (
    <>
      <Head title={`Admin #${admin.id}`} />

      <div className="w-full px-8 pt-8 mx-auto md:w-2/3">
        <div className="mx-auto">
          {flash.notice && (
            <p className="inline-block px-3 py-2 mb-5 font-medium text-green-500 rounded-lg bg-green-50">
              {flash.notice}
            </p>
          )}

          <h1 className="text-4xl font-bold">Admin #{admin.id}</h1>

          <Admin admin={admin} />

          <Link
            href={`/admins/${admin.id}/edit`}
            className="inline-block px-5 py-3 mt-2 font-medium bg-gray-100 rounded-lg"
          >
            Edit this admin
          </Link>
          <Link
            href="/admins"
            className="inline-block px-5 py-3 ml-2 font-medium bg-gray-100 rounded-lg"
          >
            Back to admins
          </Link>
          <div className="inline-block ml-2">
            <Link
              href={`/admins/${admin.id}`}
              onClick={onDestroy}
              as="button"
              method="delete"
              className="px-5 py-3 mt-2 font-medium bg-gray-100 rounded-lg"
            >
              Destroy this admin
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
