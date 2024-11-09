import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from 'zod'
import { zodResolver } from "@hookform/resolvers/zod"
import { Head } from "@inertiajs/react";
import { Button } from "@/components/ui/button";

const FormSchema = z.object({
  email: z.string().email(),
  password: z.string()
  // .min(8, "Password must be at least 8 characters long")
  // .max(64, "Password must be no more than 64 characters")
  // .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  // .regex(/\d/, "Password must contain at least one number")
  // .regex(/[\W_]/, "Password must contain at least one symbol"),
})

const SignIn = () => {
  // const props = usePage<{ 'rememberable?': boolean; } & GlobalPageProps>().props
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: "",
      password: ""
    },
  })
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

      <article className="flex items-center justify-center w-full h-screen px-4">
        <Card className="max-w-sm mx-auto">
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
                <input type="hidden" name="authenticity_token" value={(document.querySelector("meta[name='csrf-token']") as HTMLMetaElement)?.content} hidden />

                <input type="hidden" name="remember_me" value="0" hidden />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>

                      <FormControl>
                        <Input {...field} name="user[email]" placeholder="your_email@domain.com" autoFocus autoComplete="email" />
                        {/* <Input {...field} placeholder="your_email@domain.com" autoFocus autoComplete="email" /> */}
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">
                        Password

                        {/* <a href={props.forgotPasswordPath} className="inline-block ml-auto text-sm underline">
                          Forgot your password?
                        </a> */}
                      </FormLabel>

                      <FormControl>
                        <Input {...field} name="user[password]" type="password" placeholder="********" autoComplete="current-password" />
                        {/* <Input {...field} type="password" placeholder="********" autoComplete="current-password" /> */}
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

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
  )
}

export default SignIn;