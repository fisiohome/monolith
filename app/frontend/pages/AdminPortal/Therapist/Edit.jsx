import { Head, Link } from "@inertiajs/react";
import Form from "./Form";

export default function Edit({ therapist }) {
	return (
		<>
			<Head title="Editing therapist" />

			<div className="mx-auto md:w-2/3 w-full px-8 pt-8">
				<h1 className="font-bold text-4xl">Editing therapist</h1>

				<Form
					therapist={therapist}
					onSubmit={(form) => {
						form.transform((data) => ({ therapist: data }));
						form.patch(`/therapists/${therapist.id}`);
					}}
					submitText="Update therapist"
				/>

				<Link
					href={`/therapists/${therapist.id}`}
					className="ml-2 rounded-lg py-3 px-5 bg-gray-100 inline-block font-medium"
				>
					Show this therapist
				</Link>
				<Link
					href="/therapists"
					className="ml-2 rounded-lg py-3 px-5 bg-gray-100 inline-block font-medium"
				>
					Back to therapists
				</Link>
			</div>
		</>
	);
}
