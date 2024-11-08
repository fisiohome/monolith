import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { z } from 'zod'
import { zodResolver } from "@hookform/resolvers/zod"
import { Head, usePage } from "@inertiajs/react";
import { Button } from "@/components/ui/button";
import type { GlobalPageProps } from "@/types/globals";

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
  const props = usePage<{ 'rememberable?': boolean; forgotPasswordPath: string; } & GlobalPageProps>().props
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: "",
      password: ""
    },
  })
  // const onSubmit = async (data: z.infer<typeof FormSchema>) => {
  //   router.post('/sign-in', { user: { ...data } })
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
                <input type="hidden" name="authenticity_token" value={props?.X_CSRF_TOKEN} hidden />

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
                    Login
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