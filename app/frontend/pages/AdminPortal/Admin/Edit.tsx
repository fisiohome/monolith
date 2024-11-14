import { Link, Head } from '@inertiajs/react'
import Form from './Form'

export default function Edit({ admin }: any) {
  return (
    <>
      <Head title="Editing admin" />

      <div className="w-full px-8 pt-8 mx-auto md:w-2/3">
        <h1 className="text-4xl font-bold">Editing admin</h1>

        <Form
          admin={admin}
          onSubmit={(form) => {
            form.transform((data) => ({ admin: data }))
            form.patch(`/admins/${admin.id}`)
          }}
          submitText="Update admin"
        />

        <Link
          href={`/admins/${admin.id}`}
          className="inline-block px-5 py-3 ml-2 font-medium bg-gray-100 rounded-lg"
        >
          Show this admin
        </Link>
        <Link
          href="/admins"
          className="inline-block px-5 py-3 ml-2 font-medium bg-gray-100 rounded-lg"
        >
          Back to admins
        </Link>
      </div>
    </>
  )
}
