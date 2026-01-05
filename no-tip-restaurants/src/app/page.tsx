'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Search, MapPin, Plus } from 'lucide-react';
import RestaurantCard from '@/components/RestaurantCard';

// Dynamically import MapComponent to avoid SSR issues with Leaflet
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100 flex items-center justify-center">Loading map...</div>,
});

interface Restaurant {
  id: string;
  name: string;
  address: string;
  googleMapsUrl: string;
  votesTrue: number;
  votesFalse: number;
  score: number;
  distance?: number;
  isVerified: boolean;
  latitude: number;
  longitude: number;
}

export default function Home() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMapMobile, setShowMapMobile] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = { lat: position.coords.latitude, lng: position.coords.longitude };
          setUserLocation(loc);
          fetchRestaurants(loc.lat, loc.lng);
        },
        (error) => {
          console.error("Location error:", error);
          fetchRestaurants();
        }
      );
    } else {
      fetchRestaurants();
    }
  }, []);

  const fetchRestaurants = async (lat?: number, lng?: number) => {
    setLoading(true);
    try {
      let url = '/api/restaurants';
      const params = new URLSearchParams();
      if (lat && lng) {
        params.append('lat', lat.toString());
        params.append('lng', lng.toString());
      }
      
      const res = await fetch(`${url}?${params.toString()}`);
      const data = await res.json();
      setRestaurants(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRestaurants = restaurants.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-green-700 flex items-center gap-2 flex-shrink-0">
            <span role="img" aria-label="leaf">🍃</span> <span className="hidden sm:inline">Tip-Free Eats</span>
          </h1>
          
          <div className="flex-1 max-w-md relative">
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full pl-10 pr-4 py-2 border rounded-full bg-gray-100 focus:bg-white focus:ring-2 focus:ring-green-500 outline-none text-black"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>

          <Link href="/add" className="bg-green-600 text-white px-3 py-2 rounded-full font-medium hover:bg-green-700 flex items-center gap-1 flex-shrink-0 text-sm">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add Place</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* List View */}
        <div className={`w-full md:w-1/3 lg:w-1/4 bg-white overflow-y-auto border-r z-0 h-full flex flex-col ${showMapMobile ? 'hidden md:flex' : 'flex'}`}>
           {loading ? (
             <div className="p-8 text-center text-gray-500">Loading nearby spots...</div>
           ) : (
             <div className="p-4 space-y-4 pb-20 md:pb-4">
                {userLocation && (
                  <div className="text-sm text-gray-500 mb-2 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Near you
                  </div>
                )}
                {filteredRestaurants.length === 0 ? (
                  <div className="text-center text-gray-500 py-10">
                    <p>No results found.</p>
                    <Link href="/add" className="text-green-600 underline mt-2 block">Add one?</Link>
                  </div>
                ) : (
                  filteredRestaurants.map((r) => (
                    <RestaurantCard key={r.id} restaurant={r} />
                  ))
                )}
             </div>
           )}
        </div>

        {/* Map View */}
        <div className={`flex-1 bg-gray-200 relative ${!showMapMobile ? 'hidden md:block' : 'block'}`}>
           <MapComponent restaurants={filteredRestaurants} userLocation={userLocation} />
        </div>
        
        {/* Mobile Map Toggle */}
        <div className="md:hidden absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20">
          <button 
            onClick={() => setShowMapMobile(!showMapMobile)}
            className="bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg font-medium flex items-center gap-2 opacity-90 hover:opacity-100"
          >
             {showMapMobile ? 'Show List' : 'Show Map'}
          </button>
        </div>
      </div>
    </main>
  );
}
