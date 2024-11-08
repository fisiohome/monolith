export default function ErrorPage({ status }: { status: number }) {
  const title =
    {
      503: 'Service Unavailable',
      500: 'Server Error',
      404: 'Page Not Found',
      403: 'Forbidden',
    }[status] || 'Unexpected error'

  const description = {
    503: 'Sorry, we are doing some maintenance. Please check back soon.',
    500: 'Whoops, something went wrong on our servers.',
    404: 'Sorry, the page you are looking for could not be found.',
    403: 'Sorry, you are forbidden from accessing this page.',
  }[status]

  return (
    <div>
      <h1>
        {status}: {title}
      </h1>
      <div>{description}</div>
    </div>
  )
}