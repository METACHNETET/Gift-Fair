export interface Business {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  logoUrl?: string;
  website?: string;
}

export interface Fair {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  bannerUrl?: string;
}

export interface Shop {
  id: string;
  fairId: string;
  businessId: string;
  giftName: string;
  giftDescription: string;
  giftImageUrl?: string;
  leadsCount: number;
  businessName?: string; // Denormalized for easy display
}

export interface Lead {
  id: string;
  shopId: string;
  name: string;
  email: string;
  phone?: string;
  claimedAt: any;
}
