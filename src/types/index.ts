export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'citizen' | 'police' | 'admin';
  badgeId?: string;
  station?: string;
}

export interface Report {
  _id: string;
  citizenId: string;
  citizenName: string;
  type: 'theft' | 'assault' | 'robbery' | 'vandalism' | 'suspicious' | 'emergency' | 'other';
  description: string;
  location: { lat: number; lng: number; address?: string };
  media?: string[];
  status: 'pending' | 'dispatched' | 'resolved';
  assignedTo?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface Message {
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
}

export interface Chat {
  _id: string;
  reportId: string;
  citizenId: string;
  policeId?: string;
  messages: Message[];
  status: 'active' | 'closed';
  createdAt: string;
}
