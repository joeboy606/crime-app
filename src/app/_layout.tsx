import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '@/context/AuthContext';
import { ChatProvider } from '@/context/ChatContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <ChatProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="citizen" />
          <Stack.Screen name="report" />
          <Stack.Screen name="admin" />
          <Stack.Screen name="chat" />
          <Stack.Screen name="chat-list" />
          <Stack.Screen name="live-map" />
        </Stack>
        <StatusBar style="dark" />
      </ChatProvider>
    </AuthProvider>
  );
}
