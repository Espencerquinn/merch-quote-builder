import type { ProductProvider, ProductSummary, ProductDetail } from "../types";

/**
 * SanMar provider stub.
 * SanMar is a US-based wholesale apparel distributor.
 * Full implementation requires SanMar API credentials and will use their
 * product data web service (SOAP/REST) for catalog and pricing.
 *
 * API docs: https://ws.sanmar.com/
 * Requirements:
 *  - SanMar account number
 *  - Web service username/password
 *  - Product data service for catalog
 *  - Pricing service for wholesale prices
 *  - Inventory service for stock levels
 */
export class SanMarProvider implements ProductProvider {
  id = "sanmar";

  private accountNumber: string;
  private username: string;
  private password: string;

  constructor(config: {
    accountNumber: string;
    username: string;
    password: string;
  }) {
    this.accountNumber = config.accountNumber;
    this.username = config.username;
    this.password = config.password;
  }

  async listProducts(): Promise<ProductSummary[]> {
    // TODO: Implement SanMar Product Data Service integration
    // Endpoints:
    //   - getProductInfoByBrand (list by brand)
    //   - getProductInfoByCategory (list by category)
    //   - getProductInfoAll (full catalog)
    //
    // SanMar carries ~5000+ styles across brands like:
    //   Port Authority, Sport-Tek, District, Nike, OGIO, etc.

    console.warn("SanMar provider: listProducts not yet implemented");
    return [];
  }

  async getProduct(productId: string): Promise<ProductDetail> {
    // TODO: Implement SanMar product detail fetching
    // Endpoints:
    //   - getProductInfoByStyleNum (single product)
    //   - getProductPriceByStyleNum (pricing)
    //   - getInventoryQtyForStyleColorSize (stock)
    //
    // Response mapping:
    //   - SanMar "Style Number" → productId
    //   - SanMar "Color Array" → NormalizedColour[]
    //   - SanMar "Size Array" → sizes[]
    //   - Product images via SanMar media service

    throw new Error(
      `SanMar provider: getProduct(${productId}) not yet implemented`
    );
  }
}

/**
 * Create a SanMar provider instance.
 * Requires environment variables:
 *   SANMAR_ACCOUNT_NUMBER
 *   SANMAR_USERNAME
 *   SANMAR_PASSWORD
 */
export function createSanMarProvider(): SanMarProvider | null {
  const accountNumber = process.env.SANMAR_ACCOUNT_NUMBER;
  const username = process.env.SANMAR_USERNAME;
  const password = process.env.SANMAR_PASSWORD;

  if (!accountNumber || !username || !password) {
    console.warn("SanMar provider: Missing credentials, skipping registration");
    return null;
  }

  return new SanMarProvider({ accountNumber, username, password });
}
