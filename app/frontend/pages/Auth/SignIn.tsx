import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { Head } from "@inertiajs/react";
import { Eye, EyeClosed } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const FormSchema = z.object({
	"user[email]": z.string().email(),
	"user[password]": z.string(),
	"user[remember_me]": z.boolean().optional(),
	// .min(8, "Password must be at least 8 characters long")
	// .max(64, "Password must be no more than 64 characters")
	// .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
	// .regex(/\d/, "Password must contain at least one number")
	// .regex(/[\W_]/, "Password must contain at least one symbol"),
});

const SignIn = ({ rememberable }: { rememberable: boolean }) => {
	// const props = usePage<{ 'rememberable?': boolean; } & GlobalPageProps>().props

	const [passwordVisibility, setPasswordVisibility] = useState(false);
	const form = useForm<z.infer<typeof FormSchema>>({
		resolver: zodResolver(FormSchema),
		defaultValues: {
			"user[email]": "",
			"user[password]": "",
			"user[remember_me]": false,
		},
	});
	// for docs this not works
	// const onSubmit = async (data: z.infer<typeof FormSchema>) => {
	//   // using fetch
	//   const response = await fetch('sign-in', {
	//     method: 'post',
	//     headers: {
	//       'Content-Type': 'application/json',
	//     },
	//     body: JSON.stringify({ user: { ...data }, 'authenticity_token': document.querySelector("meta[name='csrf-token']")?.content })
	//   })
	//   console.log(await response.json())

	//   // using inertia router
	//   router.post('/sign-in', { user: { ...data } })
	//   window.location.reload();
	// }

	return (
		<>
			<Head title="Sign In" />

			<article className="flex items-center justify-center w-full h-screen p-4">
				<Card className="w-full mx-auto md:w-6/12 lg:w-3/12 bg-muted/50">
					<CardHeader>
						<CardTitle className="text-xl">Log in to Admin Portal</CardTitle>

						<CardDescription>
							Enter your email below to login to your account
						</CardDescription>
					</CardHeader>

					<CardContent>
						<Form {...form}>
							{/* <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4"> */}
							<form method="post" action="/sign-in" className="grid gap-4">
								<input
									type="hidden"
									name="authenticity_token"
									value={
										(
											document.querySelector(
												"meta[name='csrf-token']",
											) as HTMLMetaElement
										)?.content
									}
									hidden
								/>

								<FormField
									control={form.control}
									name="user[email]"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Email</FormLabel>

											<FormControl>
												<Input
													{...field}
													placeholder="your_email@domain.com"
													autoFocus
													autoComplete="email"
												/>
											</FormControl>

											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="user[password]"
									render={({ field }) => (
										<FormItem>
											<FormLabel className="flex items-center">
												Password
												{/* <a href={props.forgotPasswordPath} className="inline-block ml-auto text-sm underline">
                          Forgot your password?
                        </a> */}
											</FormLabel>

											<FormControl>
												<div className="relative">
													<Input
														{...field}
														type={passwordVisibility ? "text" : "password"}
														placeholder="********"
														autoComplete="current-password"
													/>
													<Button
														type="button"
														variant="ghost"
														size="icon"
														className="absolute -translate-y-1/2 right-1 top-1/2 h-7 w-7 text-muted-foreground"
														onClick={() => {
															setPasswordVisibility(!passwordVisibility);
														}}
													>
														{!passwordVisibility ? (
															<Eye className="size-4" />
														) : (
															<EyeClosed className="size-4" />
														)}
														<span className="sr-only">
															Toggle Password Visibility
														</span>
													</Button>
												</div>
											</FormControl>

											<FormMessage />
										</FormItem>
									)}
								/>

								{rememberable && (
									<FormField
										control={form.control}
										name="user[remember_me]"
										render={({ field }) => (
											<FormItem className="flex items-center space-x-2">
												<FormControl>
													<Checkbox
														name={field.name}
														checked={field.value}
														onCheckedChange={field.onChange}
														value={field.value ? 1 : 0}
													/>
												</FormControl>
												<FormLabel className="!mt-0 text-muted-foreground">
													Remember me for 3 days
												</FormLabel>
											</FormItem>
										)}
									/>
								)}

								<div className="mt-4">
									<Button type="submit" className="w-full">
										{form.formState.isSubmitting ? "Loading..." : "Login"}
									</Button>
								</div>
							</form>
						</Form>
					</CardContent>
				</Card>
			</article>
		</>
	);
};

export default SignIn;
