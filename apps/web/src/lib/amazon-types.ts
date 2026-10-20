export interface AmazonItem {
  asin: string;
  title: string;
  url: string;
  imageUrl: string | null;
  price: number;
  originalPrice: number | null;
  discountPercent: number | null;
}

export interface AmazonResult {
  configured: boolean;
  items: AmazonItem[];
  searchUrl: string;
  fetchedAt: string | null;
  error?: string;
}
