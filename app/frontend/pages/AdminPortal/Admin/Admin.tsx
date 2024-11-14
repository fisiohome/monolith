export default function Admin({ admin }: any) {
  return (
    <div>
      <p className="my-5">
        <strong className="block mb-1 font-medium">Type:</strong>
        {admin.admin_type?.toString()}
      </p>
      <p className="my-5">
        <strong className="block mb-1 font-medium">Name:</strong>
        {admin.name?.toString()}
      </p>
      <p className="my-5">
        <strong className="block mb-1 font-medium">User:</strong>
        {admin.user_id?.toString()}
      </p>
    </div>
  )
}
