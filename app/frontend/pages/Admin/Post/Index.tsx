import { Link, Head, usePage } from '@inertiajs/react'
import { Fragment } from 'react'
import Post from './Post'
import { Button } from '@/components/ui/button';
import { GlobalPageProps } from '@/types/globals';

export default function Index({ posts, flash }: { posts: any[]; flash: any }) {
  const props = usePage<GlobalPageProps>().props

  return (
    <>
      <Head title="Posts" />
      <article className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min p-6">
        {/* {flash.notice && (
          <p className="inline-block px-3 py-2 mb-5 font-medium text-green-500 rounded-lg bg-green-50">
            {flash.notice}
          </p>
        )} */}
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold">Posts</h1>

          <div className='flex space-x-2'>
            <Button asChild>
              <Link href="/admin/posts/new">
                New post
              </Link>

            </Button>

            <Button asChild>
              <a href={props.adminPortal.router.logout}>Logout</a>
            </Button>
          </div>
        </div>

        <div className="min-w-full">
          {posts.map((post) => {
            return (
              <Fragment key={post.id}>
                <Post post={post} />

                <p>
                  <Link
                    href={`/admin/posts/${post.id}`}
                    className="inline-block px-5 py-3 ml-2 font-medium bg-gray-100 rounded-lg"
                  >
                    Show this post
                  </Link>
                </p>
              </Fragment>
            )
          })}
        </div>
      </article>
    </>
  )
}
