import { Link, Head } from '@inertiajs/react'
import Form from './Form'

export default function Edit({ user }: any) {
  return (
    <>
      <Head title="Editing user" />

      <div className="w-full px-8 pt-8 mx-auto md:w-2/3">
        <h1 className="text-4xl font-bold">Editing user</h1>

        <Form
          user={user}
          onSubmit={(form) => {
            form.transform((data) => ({ user: data }))
            form.patch(`/users/${user.id}`)
          }}
          submitText="Update user"
        />

        <Link
          href={`/users/${user.id}`}
          className="inline-block px-5 py-3 ml-2 font-medium bg-gray-100 rounded-lg"
        >
          Show this user
        </Link>
        <Link
          href="/users"
          className="inline-block px-5 py-3 ml-2 font-medium bg-gray-100 rounded-lg"
        >
          Back to users
        </Link>
      </div>
    </>
  )
}
