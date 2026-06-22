import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { chatAPI } from '@/services/api';
import { useAuth } from './AuthContext';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'citizen' | 'admin';
  time: Date;
  edited?: boolean;
  isDeleted?: boolean;
}

export interface Conversation {
  citizenId: string;
  citizenName: string;
  messages: ChatMessage[];
  unreadForAdmin: number;
  unreadForCitizen: number;
  backendId?: string;
}

interface ChatContextType {
  conversations: Conversation[];
  getOrCreateConversation: (citizenId: string, citizenName: string) => Promise<void>;
  sendMessage: (text: string, citizenId: string, role: 'citizen' | 'admin') => Promise<void>;
  editMessage: (citizenId: string, messageId: string, newText: string) => void;
  deleteMessage: (citizenId: string, messageId: string) => void;
  clearUnread: (citizenId: string, role: 'citizen' | 'admin') => void;
  getTotalUnread: (role: 'citizen' | 'admin') => number;
  deleteConversation: (citizenId: string) => void;
  loadConversations: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType>({} as ChatContextType);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const loadConversations = useCallback(async () => {
    try {
      const res = await chatAPI.getAll();
      const backendChats = res.data;
      setConversations(prev => {
        const merged = [...prev];
        for (const bc of backendChats) {
          const existing = merged.find(c => c.citizenId === bc.citizenId);
          const messages = (bc.messages || []).map(m => ({
            id: m.timestamp,
            text: m.message,
            sender: m.senderRole as 'citizen' | 'admin',
            time: new Date(m.timestamp),
          }));
          const lastReadCitizen = bc.readBy_citizen ? new Date(bc.readBy_citizen) : null;
          const lastReadAdmin = bc.readBy_admin ? new Date(bc.readBy_admin) : null;
          const unreadForAdmin = messages.filter(m => m.sender === 'citizen' && (!lastReadAdmin || m.time > lastReadAdmin)).length;
          const unreadForCitizen = messages.filter(m => m.sender === 'admin' && (!lastReadCitizen || m.time > lastReadCitizen)).length;
          if (existing) {
            existing.backendId = bc._id;
            existing.messages = messages;
            existing.unreadForAdmin = unreadForAdmin;
            existing.unreadForCitizen = unreadForCitizen;
          } else {
            merged.push({
              citizenId: bc.citizenId,
              citizenName: bc.citizenName || 'Citizen',
              messages,
              unreadForAdmin,
              unreadForCitizen,
              backendId: bc._id,
            });
          }
        }
        return merged;
      });
    } catch {}
  }, []);

  useEffect(() => { if (user) { loadConversations(); const iv = setInterval(loadConversations, 3000); return () => clearInterval(iv); } }, [user]);

  const getOrCreateConversation = async (citizenId: string, citizenName: string) => {
    try {
      const res = await chatAPI.startDirect();
      const bc = res.data;
      setConversations(prev => {
        if (prev.find(c => c.citizenId === citizenId)) return prev.map(c => c.citizenId === citizenId ? { ...c, backendId: bc._id, citizenName } : c);
        return [...prev, { citizenId, citizenName, messages: [], unreadForAdmin: 0, unreadForCitizen: 0, backendId: bc._id }];
      });
    } catch {}
  };

  const sendMessage = async (text: string, citizenId: string, role: 'citizen' | 'admin') => {
    const conv = conversations.find(c => c.citizenId === citizenId);
    if (!conv?.backendId) return;
    const msg: ChatMessage = { id: Date.now().toString(), text, sender: role, time: new Date() };
    setConversations(prev => prev.map(c => {
      if (c.citizenId !== citizenId) return c;
      return {
        ...c,
        messages: [...c.messages, msg],
        unreadForAdmin: role === 'citizen' ? c.unreadForAdmin + 1 : c.unreadForAdmin,
        unreadForCitizen: role === 'admin' ? c.unreadForCitizen + 1 : c.unreadForCitizen,
      };
    }));
    try { await chatAPI.sendMessage(conv.backendId, text); } catch {}
  };

  const editMessage = (citizenId: string, messageId: string, newText: string) => {
    setConversations(prev => prev.map(c => {
      if (c.citizenId !== citizenId) return c;
      return { ...c, messages: c.messages.map(m => m.id === messageId ? { ...m, text: newText, edited: true } : m) };
    }));
  };

  const deleteMessage = (citizenId: string, messageId: string) => {
    setConversations(prev => prev.map(c => {
      if (c.citizenId !== citizenId) return c;
      return { ...c, messages: c.messages.map(m => m.id === messageId ? { ...m, text: 'This message was deleted', isDeleted: true } : m) };
    }));
  };

  const clearUnread = async (citizenId: string, role: 'citizen' | 'admin') => {
    const conv = conversations.find(c => c.citizenId === citizenId);
    if (conv?.backendId) {
      try { await chatAPI.markRead(conv.backendId, role); } catch {}
    }
    setConversations(prev => prev.map(c => {
      if (c.citizenId !== citizenId) return c;
      return {
        ...c,
        unreadForAdmin: role === 'admin' ? 0 : c.unreadForAdmin,
        unreadForCitizen: role === 'citizen' ? 0 : c.unreadForCitizen,
      };
    }));
  };

  const getTotalUnread = (role: 'citizen' | 'admin') => {
    return conversations.reduce((sum, c) => sum + (role === 'admin' ? c.unreadForAdmin : c.unreadForCitizen), 0);
  };

  const deleteConversation = (citizenId: string) => {
    setConversations(prev => prev.filter(c => c.citizenId !== citizenId));
  };

  return (
    <ChatContext.Provider value={{ conversations, getOrCreateConversation, sendMessage, editMessage, deleteMessage, clearUnread, getTotalUnread, deleteConversation, loadConversations }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => useContext(ChatContext);