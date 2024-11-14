import { Head, Link } from "@inertiajs/react";
import Form from "./Form";

export default function Edit({ post }: any) {
	return (
		<>
			<Head title="Editing post" />

			<div className="w-full px-8 pt-8 mx-auto md:w-2/3">
				<h1 className="text-4xl font-bold">Editing post</h1>

				<Form
					post={post}
					onSubmit={(form: {
						transform: (arg0: (data: any) => { post: any }) => void;
						patch: (arg0: string) => void;
					}) => {
						form.transform((data) => ({ post: data }));
						form.patch(`/admin/posts/${post.id}`);
					}}
					submitText="Update post"
				/>

				<Link
					href={`/admin/posts/${post.id}`}
					className="inline-block px-5 py-3 ml-2 font-medium bg-gray-100 rounded-lg"
				>
					Show this post
				</Link>
				<Link
					href="/posts"
					className="inline-block px-5 py-3 ml-2 font-medium bg-gray-100 rounded-lg"
				>
					Back to posts
				</Link>
			</div>
		</>
	);
}
