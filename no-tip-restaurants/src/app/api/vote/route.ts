import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { restaurantId, isTrue, voterHash } = body;

    if (!restaurantId || typeof isTrue !== 'boolean' || !voterHash) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existingVote = await prisma.vote.findFirst({
      where: {
        restaurantId,
        voterHash,
      },
    });

    if (existingVote) {
      const updatedVote = await prisma.vote.update({
        where: { id: existingVote.id },
        data: { isTrue },
      });
      return NextResponse.json(updatedVote);
    }

    const vote = await prisma.vote.create({
      data: {
        restaurantId,
        isTrue,
        voterHash,
      },
    });

    return NextResponse.json(vote);
  } catch (error) {
    console.error('Error submitting vote:', error);
    return NextResponse.json({ error: 'Failed to submit vote' }, { status: 500 });
  }
}

