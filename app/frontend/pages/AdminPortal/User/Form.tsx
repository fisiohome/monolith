import type { FormDataConvertible } from "@inertiajs/core";
import { type InertiaFormProps, useForm } from "@inertiajs/react";
import type { FormEvent } from "react";

type UserFormData = Record<string, FormDataConvertible>;

interface UserFormProps {
	user: Record<string, unknown>;
	onSubmit: (form: InertiaFormProps<UserFormData>) => void;
	submitText: string;
}

export default function Form({
	user: _user,
	onSubmit,
	submitText,
}: UserFormProps) {
	const form = useForm<UserFormData>({});
	const { data: _data, setData: _setData, errors: _errors, processing } = form;

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		onSubmit(form);
	};

	return (
		<form onSubmit={handleSubmit} className="contents">
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
