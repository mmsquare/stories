'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
}

export default function AddRestaurantForm() {
  const [name, setName] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [addressQuery, setAddressQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<NominatimResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const searchLocation = async () => {
    if (!addressQuery) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}`);
      const data = await res.json();
      setSearchResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocation) {
      setMessage('Please select a location');
      return;
    }
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          googleMapsUrl,
          address: selectedLocation.display_name,
          latitude: parseFloat(selectedLocation.lat),
          longitude: parseFloat(selectedLocation.lon),
        }),
      });

      if (res.ok) {
        setMessage('Restaurant added successfully!');
        setName('');
        setGoogleMapsUrl('');
        setAddressQuery('');
        setSelectedLocation(null);
        setSearchResults([]);
      } else {
        setMessage('Failed to add restaurant');
      }
    } catch (e) {
      setMessage('Error submitting form');
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Add No-Tip Restaurant</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Restaurant Name</label>
          <input
            type="text"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-black"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Google Maps Link</label>
          <input
            type="url"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 text-black"
            value={googleMapsUrl}
            onChange={(e) => setGoogleMapsUrl(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Location Search</label>
          <div className="flex gap-2 mt-1">
            <input
              type="text"
              className="block w-full rounded-md border-gray-300 shadow-sm border p-2 text-black"
              value={addressQuery}
              onChange={(e) => setAddressQuery(e.target.value)}
              placeholder="Address or City..."
            />
            <button
              type="button"
              onClick={searchLocation}
              disabled={isSearching}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300"
            >
              {isSearching ? <Loader2 className="animate-spin h-5 w-5" /> : <Search className="h-5 w-5" />}
            </button>
          </div>
          
          {searchResults.length > 0 && !selectedLocation && (
            <ul className="mt-2 border rounded-md divide-y max-h-40 overflow-auto bg-white">
              {searchResults.map((result) => (
                <li
                  key={result.place_id}
                  onClick={() => {
                    setSelectedLocation(result);
                    setSearchResults([]);
                    setAddressQuery(result.display_name);
                  }}
                  className="p-2 hover:bg-gray-50 cursor-pointer text-sm text-black"
                >
                  {result.display_name}
                </li>
              ))}
            </ul>
          )}
          {selectedLocation && (
             <div className="mt-2 text-sm text-green-600">
                Selected: {selectedLocation.display_name.substring(0, 50)}...
                <button type="button" onClick={() => setSelectedLocation(null)} className="ml-2 text-red-500 text-xs underline">Change</button>
             </div>
          )}
        </div>

        {message && <p className="text-sm text-center font-medium text-gray-800">{message}</p>}

        <button
          type="submit"
          disabled={isSubmitting || !selectedLocation}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400"
        >
          {isSubmitting ? 'Adding...' : 'Add Restaurant'}
        </button>
      </form>
    </div>
  );
}

