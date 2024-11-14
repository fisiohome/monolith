import { useForm } from "@inertiajs/react";

export default function Form({ post, onSubmit, submitText }: any) {
	const form = useForm({
		title: post.title || "",
	});
	const { data, setData, errors, processing } = form;

	const handleSubmit = (e: any) => {
		e.preventDefault();
		onSubmit(form);
	};

	return (
		<form onSubmit={handleSubmit} className="contents">
			<div className="my-5">
				<label htmlFor="title">Title</label>
				<input
					type="text"
					name="title"
					id="title"
					value={data.title}
					className="block w-full px-3 py-2 mt-2 border border-gray-400 rounded-md shadow outline-none"
					onChange={(e) => setData("title", e.target.value)}
				/>
				{errors.title && (
					<div className="px-3 py-2 font-medium text-red-500">
						{errors.title.join(", ")}
					</div>
				)}
			</div>

			<div className="inline">
				<button
					type="submit"
					disabled={processing}
					className="inline-block px-5 py-3 font-medium text-white bg-blue-600 rounded-lg cursor-pointer"
				>
					{submitText}
				</button>
			</div>
		</form>
	);
}
