import { Head, Link } from "@inertiajs/react";
import Therapist from "./Therapist";

export default function Show({ therapist, flash }) {
	const onDestroy = (e) => {
		if (!confirm("Are you sure you want to delete this therapist?")) {
			e.preventDefault();
		}
	};

	return (
		<>
			<Head title={`Therapist #${therapist.id}`} />

			<div className="mx-auto md:w-2/3 w-full px-8 pt-8">
				<div className="mx-auto">
					{flash.notice && (
						<p className="py-2 px-3 bg-green-50 mb-5 text-green-500 font-medium rounded-lg inline-block">
							{flash.notice}
						</p>
					)}

					<h1 className="font-bold text-4xl">Therapist #{therapist.id}</h1>

					<Therapist therapist={therapist} />

					<Link
						href={`/therapists/${therapist.id}/edit`}
						className="mt-2 rounded-lg py-3 px-5 bg-gray-100 inline-block font-medium"
					>
						Edit this therapist
					</Link>
					<Link
						href="/therapists"
						className="ml-2 rounded-lg py-3 px-5 bg-gray-100 inline-block font-medium"
					>
						Back to therapists
					</Link>
					<div className="inline-block ml-2">
						<Link
							href={`/therapists/${therapist.id}`}
							onClick={onDestroy}
							as="button"
							method="delete"
							className="mt-2 rounded-lg py-3 px-5 bg-gray-100 font-medium"
						>
							Destroy this therapist
						</Link>
					</div>
				</div>
			</div>
		</>
	);
}
