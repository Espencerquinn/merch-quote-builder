import { NextResponse } from 'next/server';
import '@/lib/providers/init';
import { getProvider, resolveProductId } from '@/lib/providers/registry';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId: compoundId } = await params;

  try {
    const { providerId, productId } = resolveProductId(decodeURIComponent(compoundId));
    const provider = getProvider(providerId);
    const product = await provider.getProduct(productId);
    return NextResponse.json(product);
  } catch (error) {
    console.error(`Error fetching product ${compoundId}:`, error);
    const message = error instanceof Error ? error.message : 'Failed to fetch product';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
