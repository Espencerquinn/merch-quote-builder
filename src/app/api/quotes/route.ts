import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { quotes } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { designState, quote, lead } = body;

    const status = lead ? 'saved' : 'started';

    const [quoteRecord] = await db
      .insert(quotes)
      .values({
        designStateJson: JSON.stringify(designState),
        quoteJson: JSON.stringify(quote),
        leadJson: lead ? JSON.stringify(lead) : null,
        status: status as 'started' | 'saved',
      })
      .returning();

    // Send email if lead data provided
    if (lead?.email) {
      try {
        await sendQuoteEmail(lead.email, lead.name, quote, quoteRecord.id);
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      quoteId: quoteRecord.id,
      message: 'Quote saved successfully'
    });
  } catch (error) {
    console.error('Error saving quote:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save quote' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const allQuotes = await db
      .select()
      .from(quotes)
      .orderBy(desc(quotes.createdAt));

    // Transform back to the shape the admin dashboard expects
    const formatted = allQuotes.map((q) => ({
      id: q.id,
      designState: JSON.parse(q.designStateJson),
      quote: JSON.parse(q.quoteJson),
      lead: q.leadJson ? JSON.parse(q.leadJson) : null,
      status: q.status,
      createdAt: q.createdAt?.toISOString(),
      updatedAt: q.updatedAt?.toISOString(),
    }));

    return NextResponse.json({ quotes: formatted });
  } catch (error) {
    console.error('Error fetching quotes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch quotes' },
      { status: 500 }
    );
  }
}

async function sendQuoteEmail(
  email: string,
  name: string,
  quote: {
    quantity: number;
    blankCostTotal: number;
    printCostTotal: number;
    setupFee: number;
    totalCost: number;
    costPerUnit: number;
  },
  quoteId: string
) {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    console.log('Resend API key not configured, skipping email');
    console.log('Would send email to:', email);
    console.log('Quote details:', quote);
    return;
  }

  const { Resend } = await import('resend');
  const resend = new Resend(resendApiKey);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);

  await resend.emails.send({
    from: 'Merch Makers <quotes@merchmakers.com>',
    to: email,
    subject: 'Your Merch Makers Quote Is Ready',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; padding: 20px 0; }
            .logo { font-size: 24px; font-weight: bold; color: #3b82f6; }
            .quote-box { background: #f8fafc; border-radius: 12px; padding: 24px; margin: 20px 0; }
            .quote-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
            .quote-row:last-child { border-bottom: none; }
            .quote-label { color: #64748b; }
            .quote-value { font-weight: 600; }
            .total-row { font-size: 18px; color: #3b82f6; padding-top: 16px; margin-top: 8px; border-top: 2px solid #3b82f6; }
            .cta-button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; color: #94a3b8; font-size: 14px; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Merch Makers</div>
            </div>

            <h1>Hey ${name}!</h1>
            <p>Thanks for designing with us. Here's your quote breakdown:</p>

            <div class="quote-box">
              <div class="quote-row">
                <span class="quote-label">Quantity</span>
                <span class="quote-value">${quote.quantity} units</span>
              </div>
              <div class="quote-row">
                <span class="quote-label">Blank Cost</span>
                <span class="quote-value">${formatCurrency(quote.blankCostTotal)}</span>
              </div>
              <div class="quote-row">
                <span class="quote-label">Print Cost (DTG)</span>
                <span class="quote-value">${formatCurrency(quote.printCostTotal)}</span>
              </div>
              ${quote.setupFee > 0 ? `
              <div class="quote-row">
                <span class="quote-label">Setup Fee</span>
                <span class="quote-value">${formatCurrency(quote.setupFee)}</span>
              </div>
              ` : ''}
              <div class="quote-row total-row">
                <span>Estimated Total</span>
                <span>${formatCurrency(quote.totalCost)}</span>
              </div>
              <div class="quote-row">
                <span class="quote-label">Cost per unit</span>
                <span class="quote-value">${formatCurrency(quote.costPerUnit)}</span>
              </div>
            </div>

            <p style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/builder?resume=${quoteId}" class="cta-button">
                Resume Your Design
              </a>
            </p>

            <p>Need help with your order? Just reply to this email and our team will be happy to assist.</p>

            <div class="footer">
              <p>Merch Makers. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}
