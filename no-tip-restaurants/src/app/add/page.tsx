import AddRestaurantForm from '@/components/AddRestaurantForm';
import Link from 'next/link';

export default function AddPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <Link href="/" className="text-blue-500 hover:underline">&larr; Back to Home</Link>
        </div>
        <AddRestaurantForm />
      </div>
    </div>
  );
}

