export interface User {
  id: string;
  clerkId?: string;
  email: string;
  name: string;
  avatarUrl?: string;
  clanId?: string;
}

export interface Run {
  id: string;
  userId: string;
  startTime: string;
  endTime?: string;
  coordinates: { latitude: number; longitude: number }[];
  distance: number;
  pace: number;
  duration: number;
}

export interface Territory {
  id: string;
  name: string;
  ownerClanId?: string;
  boundaries: { latitude: number; longitude: number }[];
}

export interface Attack {
  id: string;
  territoryId: string;
  attackingClanId: string;
  startTime: string;
  status: 'pending' | 'active' | 'resolved';
}

export interface Clan {
  id: string;
  name: string;
  logoUrl?: string;
  membersCount: number;
}
