import { Link, Head } from '@inertiajs/react'
import Post from './Post'

export default function Show({ post, flash }: any) {
  const onDestroy = (e: any) => {
    if (!confirm('Are you sure you want to delete this post?')) {
      e.preventDefault()
    }
  }

  return (
    <>
      <Head title={`Post #${post.id}`} />

      <div className="w-full px-8 pt-8 mx-auto md:w-2/3">
        <div className="mx-auto">
          {flash.notice && (
            <p className="inline-block px-3 py-2 mb-5 font-medium text-green-500 rounded-lg bg-green-50">
              {flash.notice}
            </p>
          )}

          <h1 className="text-4xl font-bold">Post #{post.id}</h1>

          <Post post={post} />

          <Link
            href={`/admin/posts/${post.id}/edit`}
            className="inline-block px-5 py-3 mt-2 font-medium bg-gray-100 rounded-lg"
          >
            Edit this post
          </Link>
          <Link
            href="/admin/posts"
            className="inline-block px-5 py-3 ml-2 font-medium bg-gray-100 rounded-lg"
          >
            Back to posts
          </Link>
          <div className="inline-block ml-2">
            <Link
              href={`/admin/posts/${post.id}`}
              onClick={onDestroy}
              as="button"
              method="delete"
              className="px-5 py-3 mt-2 font-medium bg-gray-100 rounded-lg"
            >
              Destroy this post
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
