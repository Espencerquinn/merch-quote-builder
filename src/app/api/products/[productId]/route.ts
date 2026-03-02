import { NextResponse } from 'next/server';
import { getCachedProductDetail } from '@/lib/cache/product-cache';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId: compoundId } = await params;

  try {
    const product = await getCachedProductDetail(decodeURIComponent(compoundId));
    return NextResponse.json(product);
  } catch (error) {
    console.error(`Error fetching product ${compoundId}:`, error);
    const message = error instanceof Error ? error.message : 'Failed to fetch product';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
