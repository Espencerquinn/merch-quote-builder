import { NextResponse } from 'next/server';
import { getCachedProductList } from '@/lib/cache/product-cache';

export async function GET() {
  try {
    const allProducts = await getCachedProductList();
    return NextResponse.json({ data: allProducts });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
