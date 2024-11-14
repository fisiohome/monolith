import { Head, Link } from "@inertiajs/react";
import Form from "./Form";

export default function New({ user }: any) {
	return (
		<>
			<Head title="New user" />

			<div className="w-full px-8 pt-8 mx-auto md:w-2/3">
				<h1 className="text-4xl font-bold">New user</h1>

				<Form
					user={user}
					onSubmit={(form) => {
						form.transform((data) => ({ user: data }));
						form.post("/users");
					}}
					submitText="Create user"
				/>

				<Link
					href="/users"
					className="inline-block px-5 py-3 ml-2 font-medium bg-gray-100 rounded-lg"
				>
					Back to users
				</Link>
			</div>
		</>
	);
}
