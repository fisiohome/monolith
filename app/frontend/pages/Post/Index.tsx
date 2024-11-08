import { Link, Head } from '@inertiajs/react'
import { Fragment } from 'react'
import Post from './Post'

export default function Index({ posts, flash }: { posts: any[]; flash: any }) {
  console.log(posts)
  return (
    <>
      <Head title="Posts" />
      <div className="w-full px-8 pt-8 mx-auto md:w-2/3">
        {flash.notice && (
          <p className="inline-block px-3 py-2 mb-5 font-medium text-green-500 rounded-lg bg-green-50">
            {flash.notice}
          </p>
        )}
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold">Posts</h1>
          <Link
            href="/posts/new"
            className="block px-5 py-3 font-medium text-white bg-blue-600 rounded-lg"
          >
            New post
          </Link>
        </div>

        <div className="min-w-full">
          {posts.map((post) => {
            return (
              <Fragment key={post.id}>
                <Post post={post} />

                <p>
                  <Link
                    href={`/posts/${post.id}`}
                    className="inline-block px-5 py-3 ml-2 font-medium bg-gray-100 rounded-lg"
                  >
                    Show this post
                  </Link>
                </p>
              </Fragment>
            )
          })}
        </div>
      </div>
    </>
  )
}
