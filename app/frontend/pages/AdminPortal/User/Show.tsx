import { Link, Head } from '@inertiajs/react'
import UserDetail from './User'

export default function Show({ user, flash }: any) {
  const onDestroy = (e) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      e.preventDefault()
    }
  }

  return (
    <>
      <Head title={`User #${user.id}`} />

      <div className="w-full px-8 pt-8 mx-auto md:w-2/3">
        <div className="mx-auto">
          {flash.notice && (
            <p className="inline-block px-3 py-2 mb-5 font-medium text-green-500 rounded-lg bg-green-50">
              {flash.notice}
            </p>
          )}

          <h1 className="text-4xl font-bold">User #{user.id}</h1>

          <UserDetail user={user} />

          <Link
            href={`/users/${user.id}/edit`}
            className="inline-block px-5 py-3 mt-2 font-medium bg-gray-100 rounded-lg"
          >
            Edit this user
          </Link>
          <Link
            href="/users"
            className="inline-block px-5 py-3 ml-2 font-medium bg-gray-100 rounded-lg"
          >
            Back to users
          </Link>
          <div className="inline-block ml-2">
            <Link
              href={`/users/${user.id}`}
              onClick={onDestroy}
              as="button"
              method="delete"
              className="px-5 py-3 mt-2 font-medium bg-gray-100 rounded-lg"
            >
              Destroy this user
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
