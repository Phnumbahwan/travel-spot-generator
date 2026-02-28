export interface Review {
  author: string;
  rating: number;
  comment: string;
  date: string;
}

export interface TouristSpot {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  address: string;
  distance: string;
  rating: number;
  reviewCount: number;
  reviews: Review[];
  entranceFee: string;
  category: string;
  openingHours: string;
  bestTimeToVisit: string;
  highlights: string[];
  tags: string[];
  imageUrl?: string | null;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface SearchResponse {
  locationName: string;
  spots: TouristSpot[];
}
