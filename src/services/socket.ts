import { io } from 'socket.io-client';
import { SOCKET_URL } from './config';

const socket = io(SOCKET_URL, { autoConnect: false });

export const connectSocket = () => {
  if (!socket.connected) socket.connect();
};

export const disconnectSocket = () => {
  if (socket.connected) socket.disconnect();
};

export const joinChat = (chatId: string) => {
  socket.emit('join-chat', chatId);
};

export const sendMessage = (data: { chatId: string; senderId: string; senderName: string; message: string }) => {
  socket.emit('send-message', data);
};

export const onNewMessage = (callback: (data: any) => void) => {
  socket.on('new-message', callback);
  return () => socket.off('new-message', callback);
};

export default socket;
