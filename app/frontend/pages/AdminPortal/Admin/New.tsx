import { Link, Head } from '@inertiajs/react'
import Form from './Form'

export default function New({ admin }: any) {
  return (
    <>
      <Head title="New admin" />

      <div className="w-full px-8 pt-8 mx-auto md:w-2/3">
        <h1 className="text-4xl font-bold">New admin</h1>

        <Form
          admin={admin}
          onSubmit={(form) => {
            form.transform((data) => ({ admin: data }))
            form.post('/admins')
          }}
          submitText="Create admin"
        />

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
