'use client';

import { ThumbsUp, ThumbsDown, MapPin, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';

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

export default function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  const [voterHash, setVoterHash] = useState('');
  const [localVotesTrue, setLocalVotesTrue] = useState(restaurant.votesTrue);
  const [localVotesFalse, setLocalVotesFalse] = useState(restaurant.votesFalse);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    let hash = localStorage.getItem('voterHash');
    if (!hash) {
      hash = Math.random().toString(36).substring(7);
      localStorage.setItem('voterHash', hash);
    }
    setVoterHash(hash);
  }, []);

  const handleVote = async (isTrue: boolean) => {
    if (!voterHash) return;
    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          isTrue,
          voterHash,
        }),
      });
      if (res.ok) {
        if (isTrue) setLocalVotesTrue((prev) => prev + 1);
        else setLocalVotesFalse((prev) => prev + 1);
        setHasVoted(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-bold text-lg text-black">{restaurant.name}</h3>
          <p className="text-sm text-gray-500 flex items-start gap-1 mt-1">
            <MapPin className="w-3 h-3 mt-1 flex-shrink-0" />
            <span className="line-clamp-2">{restaurant.address}</span>
          </p>
          {restaurant.distance !== undefined && (
            <p className="text-xs text-blue-600 mt-1 font-medium">
              {(restaurant.distance / 1609.34).toFixed(1)} miles away
            </p>
          )}
        </div>
        <a
          href={restaurant.googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-700 ml-2 p-1"
        >
          <ExternalLink className="w-5 h-5" />
        </a>
      </div>

      <div className="mt-4 flex items-center justify-between border-t pt-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs rounded-full font-bold ${restaurant.isVerified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
            {restaurant.isVerified ? 'Verified Tip-Free' : 'Unverified'}
          </span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => handleVote(true)}
            disabled={hasVoted}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-green-600 disabled:opacity-50"
            title="Confirm Tip-Free"
          >
            <ThumbsUp className="w-4 h-4" /> {localVotesTrue}
          </button>
          <button
            onClick={() => handleVote(false)}
            disabled={hasVoted}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-red-600 disabled:opacity-50"
            title="Dispute"
          >
            <ThumbsDown className="w-4 h-4" /> {localVotesFalse}
          </button>
        </div>
      </div>
    </div>
  );
}

