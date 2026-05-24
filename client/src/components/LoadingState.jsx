import LoadingSpinner from './LoadingSpinner'

export default function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="py-12 px-6 text-center">
      <LoadingSpinner size="lg" />
      <p className="text-gray-600 text-sm mt-4">{message}</p>
    </div>
  )
}
