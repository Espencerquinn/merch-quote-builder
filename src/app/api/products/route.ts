import { NextResponse } from 'next/server';
import '@/lib/providers/init';
import { getAllProviders } from '@/lib/providers/registry';

export async function GET() {
  try {
    const providers = getAllProviders();
    const results = await Promise.all(
      providers.map(p => p.listProducts().catch(err => {
        console.error(`Provider ${p.id} failed to list products:`, err);
        return [];
      }))
    );

    const allProducts = results.flat();
    return NextResponse.json({ data: allProducts });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
