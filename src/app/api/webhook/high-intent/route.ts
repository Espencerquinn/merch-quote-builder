import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lead, highIntent, designState, quote } = body;

    // Log the high-intent lead for now
    console.log('High-intent lead received:', {
      lead,
      highIntent,
      designState,
      quote,
      timestamp: new Date().toISOString(),
    });

    // In production, send to CRM webhook
    const crmWebhookUrl = process.env.CRM_WEBHOOK_URL;
    
    if (crmWebhookUrl) {
      await fetch(crmWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'high_intent_lead',
          lead: {
            name: lead.name,
            email: lead.email,
            brandName: lead.brandName,
            isSellingThese: lead.isSellingThese,
            category: 'high-intent',
          },
          qualification: {
            socialLink: highIntent.socialLink,
            timeline: highIntent.timeline,
            revenueGoal: highIntent.revenueGoal,
          },
          quote: {
            quantity: quote.quantity,
            totalCost: quote.totalCost,
            costPerUnit: quote.costPerUnit,
          },
          product: {
            productId: designState.productId,
            colorId: designState.colorId,
          },
          timestamp: new Date().toISOString(),
        }),
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'High-intent lead captured' 
    });
  } catch (error) {
    console.error('Error processing high-intent webhook:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process lead' },
      { status: 500 }
    );
  }
}
