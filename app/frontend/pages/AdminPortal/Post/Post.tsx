export default function Post({ post }: any) {
	return (
		<div>
			<p>asd</p>
			<p className="my-5">
				<strong className="block mb-1 font-medium">Title:</strong>
				{post?.title?.toString()}
			</p>
		</div>
	);
}
