import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDistance } from 'geolib';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  try {
    const restaurants = await prisma.restaurant.findMany({
      include: {
        votes: true,
      },
    });

    const restaurantsWithStats = restaurants.map((r) => {
      const votesTrue = r.votes.filter((v) => v.isTrue).length;
      const votesFalse = r.votes.filter((v) => !v.isTrue).length;
      const score = votesTrue - votesFalse;
      return {
        ...r,
        votesTrue,
        votesFalse,
        score,
        // Don't send full votes array to save bandwidth if not needed, 
        // but for now keeping it simple. We can omit it in destructuring if needed.
        votes: undefined, // Hide raw votes
      };
    });

    if (lat && lng) {
      const userLocation = { latitude: parseFloat(lat), longitude: parseFloat(lng) };
      
      const sorted = restaurantsWithStats
        .map((r) => {
           const distance = getDistance(userLocation, { latitude: r.latitude, longitude: r.longitude });
           return { ...r, distance };
        })
        .sort((a, b) => a.distance - b.distance);

      return NextResponse.json(sorted);
    }

    return NextResponse.json(restaurantsWithStats);
  } catch (error) {
    console.error('Error fetching restaurants:', error);
    return NextResponse.json({ error: 'Failed to fetch restaurants' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, googleMapsUrl, address, latitude, longitude } = body;

    if (!name || !googleMapsUrl || !latitude || !longitude) {
       return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const restaurant = await prisma.restaurant.create({
      data: {
        name,
        googleMapsUrl,
        address,
        latitude,
        longitude,
      },
    });

    return NextResponse.json(restaurant);
  } catch (error) {
    console.error('Error creating restaurant:', error);
    return NextResponse.json({ error: 'Failed to create restaurant' }, { status: 500 });
  }
}

