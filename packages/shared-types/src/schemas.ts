import { z } from "zod";

export const ChainSchema = z.object({
  id: z.string(),
  name: z.string(),
  logoUrl: z.string().url().optional(),
  website: z.string().url(),
});
export type Chain = z.infer<typeof ChainSchema>;

export const StoreSchema = z.object({
  id: z.string(),
  chainId: z.string(),
  address: z.string(),
  city: z.string(),
  region: z.string(),
  lat: z.number(),
  lng: z.number(),
});
export type Store = z.infer<typeof StoreSchema>;

export const BrandSchema = z.object({
  id: z.string(),
  name: z.string(),
  isPrivateLabel: z.boolean().default(false),
});
export type Brand = z.infer<typeof BrandSchema>;

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  parentId: z.string().nullable(),
});
export type Category = z.infer<typeof CategorySchema>;

export const UnitOfMeasureSchema = z.enum(["kg", "g", "l", "ml", "pz"]);
export type UnitOfMeasure = z.infer<typeof UnitOfMeasureSchema>;

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  brandId: z.string().nullable(),
  categoryId: z.string().nullable(),
  ean: z.string().nullable(),
  unitSize: z.number().positive(),
  unitOfMeasure: UnitOfMeasureSchema,
  canonicalImageUrl: z.string().url().nullable(),
});
export type Product = z.infer<typeof ProductSchema>;

export const ProductAliasSchema = z.object({
  id: z.string(),
  productId: z.string(),
  chainId: z.string(),
  rawName: z.string(),
  confidence: z.number().min(0).max(1),
});
export type ProductAlias = z.infer<typeof ProductAliasSchema>;

export const FlyerSourceTypeSchema = z.enum(["html", "pdf"]);
export type FlyerSourceType = z.infer<typeof FlyerSourceTypeSchema>;

export const FlyerSchema = z.object({
  id: z.string(),
  chainId: z.string(),
  storeId: z.string().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  sourceUrl: z.string().url(),
  sourceType: FlyerSourceTypeSchema,
  scrapedAt: z.coerce.date(),
});
export type Flyer = z.infer<typeof FlyerSchema>;

export const OfferSchema = z.object({
  id: z.string(),
  flyerId: z.string(),
  productId: z.string().nullable(),
  rawName: z.string(),
  price: z.number().positive(),
  originalPrice: z.number().positive().nullable(),
  discountPercent: z.number().min(0).max(100).nullable(),
  unitPrice: z.number().positive(),
  imageUrl: z.string().url().nullable(),
});
export type Offer = z.infer<typeof OfferSchema>;

export const PriceHistoryEntrySchema = z.object({
  id: z.string(),
  productId: z.string(),
  chainId: z.string(),
  storeId: z.string().nullable(),
  price: z.number().positive(),
  unitPrice: z.number().positive(),
  observedAt: z.coerce.date(),
});
export type PriceHistoryEntry = z.infer<typeof PriceHistoryEntrySchema>;

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  preferredChainIds: z.array(z.string()).default([]),
});
export type User = z.infer<typeof UserSchema>;

export const ShoppingListItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  productId: z.string().nullable(),
  freeTextName: z.string().nullable(),
  quantity: z.number().positive().default(1),
  addedAt: z.coerce.date(),
});
export type ShoppingListItem = z.infer<typeof ShoppingListItemSchema>;

export const AlertThresholdTypeSchema = z.enum(["price-drop", "any-offer"]);
export type AlertThresholdType = z.infer<typeof AlertThresholdTypeSchema>;

export const AlertChannelSchema = z.enum(["push", "email"]);
export type AlertChannel = z.infer<typeof AlertChannelSchema>;

export const AlertSchema = z.object({
  id: z.string(),
  userId: z.string(),
  productId: z.string().nullable(),
  categoryId: z.string().nullable(),
  thresholdType: AlertThresholdTypeSchema,
  channel: AlertChannelSchema,
});
export type Alert = z.infer<typeof AlertSchema>;
