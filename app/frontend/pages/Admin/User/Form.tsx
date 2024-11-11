import { useForm } from '@inertiajs/react'

export default function Form({ user, onSubmit, submitText }: any) {
  const form = useForm({
  })
  const { data, setData, errors, processing } = form

  const handleSubmit = (e: any) => {
    e.preventDefault()
    onSubmit(form)
  }

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
  )
}
