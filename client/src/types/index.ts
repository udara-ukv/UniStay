export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: 'student' | 'owner' | 'admin';
  avatar_url?: string;
  is_verified: boolean;
  university?: string;
  bio?: string;
  created_at: string;
}

export interface Listing {
  id: number;
  owner_id: number;
  title: string;
  description: string;
  rent: number;
  currency: string;
  location: string;
  address: string;
  latitude?: number;
  longitude?: number;
  distance_from_uni?: number;
  room_type: 'single' | 'shared' | 'annex' | 'house';
  gender_pref: 'male' | 'female' | 'any';
  max_occupants: number;
  facilities: string[];
  rules: string[];
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  is_verified: boolean;
  views_count: number;
  created_at: string;
  updated_at: string;
  owner_name?: string;
  owner_phone?: string;
  owner_email?: string;
  owner_verified?: boolean;
  primary_image?: string;
  image_count?: number;
  avg_rating?: number;
  review_count?: number;
  is_favorited?: boolean;
  images?: ListingImage[];
  reviews?: Review[];
}

export interface ListingImage {
  id: number;
  listing_id: number;
  image_url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface Review {
  id: number;
  student_id: number;
  listing_id: number;
  cleanliness: number;
  safety: number;
  internet: number;
  landlord: number;
  value_for_money: number;
  overall: number;
  comment: string;
  created_at: string;
  reviewer_name?: string;
  reviewer_avatar?: string;
}

export interface Inquiry {
  id: number;
  student_id: number;
  listing_id: number;
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  owner_response?: string;
  created_at: string;
  responded_at?: string;
  listing_title?: string;
  listing_image?: string;
  student_name?: string;
  student_email?: string;
  owner_name?: string;
  rent?: number;
  location?: string;
}

export interface RoommateProfile {
  id: number;
  user_id: number;
  budget_min: number;
  budget_max: number;
  sleep_schedule: 'early' | 'normal' | 'late';
  study_habits: 'quiet' | 'moderate' | 'social';
  smoking: boolean;
  gender_pref: 'male' | 'female' | 'any';
  cleanliness_level: 'high' | 'medium' | 'low';
  bio: string;
  name?: string;
  university?: string;
  avatar_url?: string;
  compatibility?: number;
}

export interface SearchFilters {
  q?: string;
  rent_min?: number;
  rent_max?: number;
  room_type?: string;
  gender_pref?: string;
  distance_max?: number;
  location?: string;
  facilities?: string;
  sort?: string;
}

export interface PaginatedResponse<T> {
  listings: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number; };
}

export interface Analytics {
  users: { total: number; students: number; owners: number; };
  listings: { total: number; approved: number; pending: number; };
  reviews: { total: number; };
  inquiries: { total: number; pending: number; };
  reports: { total: number; };
  avgRent: number;
  recentListings: Listing[];
  recentUsers: User[];
}
