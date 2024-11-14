import { useForm } from "@inertiajs/react";

export default function Form({ admin, onSubmit, submitText }: any) {
	const form = useForm({
		admin_type: admin.admin_type || "",
		name: admin.name || "",
		user_id: admin.user_id || "",
	});
	const { data, setData, errors, processing } = form;

	const handleSubmit = (e) => {
		e.preventDefault();
		onSubmit(form);
	};

	return (
		<form onSubmit={handleSubmit} className="contents">
			<div className="my-5">
				<label htmlFor="admin_type">Admin Type</label>
				<input
					type="text"
					name="admin_type"
					id="admin_type"
					value={data.admin_type}
					className="block w-full px-3 py-2 mt-2 border border-gray-400 rounded-md shadow outline-none"
					onChange={(e) => setData("admin_type", e.target.value)}
				/>
				{errors.admin_type && (
					<div className="px-3 py-2 font-medium text-red-500">
						{errors.admin_type.join(", ")}
					</div>
				)}
			</div>

			<div className="my-5">
				<label htmlFor="name">Name</label>
				<input
					type="text"
					name="name"
					id="name"
					value={data.name}
					className="block w-full px-3 py-2 mt-2 border border-gray-400 rounded-md shadow outline-none"
					onChange={(e) => setData("name", e.target.value)}
				/>
				{errors.name && (
					<div className="px-3 py-2 font-medium text-red-500">
						{errors.name.join(", ")}
					</div>
				)}
			</div>

			<div className="my-5">
				<label htmlFor="user">User</label>
				<input
					type="text"
					name="user"
					id="user"
					value={data.user_id}
					className="block w-full px-3 py-2 mt-2 border border-gray-400 rounded-md shadow outline-none"
					onChange={(e) => setData("user_id", e.target.value)}
				/>
				{errors.user_id && (
					<div className="px-3 py-2 font-medium text-red-500">
						{errors.user_id.join(", ")}
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
