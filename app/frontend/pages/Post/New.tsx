import { Link, Head } from '@inertiajs/react'
import Form from './Form'

export default function New({ post }: any) {
  return (
    <>
      <Head title="New post" />

      <div className="w-full px-8 pt-8 mx-auto md:w-2/3">
        <h1 className="text-4xl font-bold">New post</h1>

        <Form
          post={post}
          onSubmit={(form) => {
            form.transform((data) => ({ post: data }))
            form.post('/posts')
          }}
          submitText="Create post"
        />

        <Link
          href="/posts"
          className="inline-block px-5 py-3 ml-2 font-medium bg-gray-100 rounded-lg"
        >
          Back to posts
        </Link>
      </div>
    </>
  )
}
