import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { router } from 'expo-router';
import { useChat } from '@/context/ChatContext';

export default function ChatListScreen() {
  const { conversations, clearUnread, loadConversations, deleteConversation } = useChat();
  const [poll, setPoll] = useState(0);

  useEffect(() => { loadConversations(); const iv = setInterval(() => setPoll(k => k + 1), 5000); return () => clearInterval(iv); }, []);
  useEffect(() => { loadConversations(); }, [poll]);

  const handleLongPress = (citizenId: string, citizenName: string) => {
    Alert.alert(citizenName, '', [
      {
        text: 'Delete Chat',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Confirm Delete', `Delete conversation with ${citizenName}?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteConversation(citizenId) },
          ]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Live Chats</Text>
        <Text style={styles.subtitle}>Area Command, Auchi Division</Text>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={c => c.citizenId}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No conversations yet</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => { clearUnread(item.citizenId, 'admin'); router.push({ pathname: '/chat' as any, params: { role: 'admin', citizenId: item.citizenId, citizenName: item.citizenName } }); }}
            onLongPress={() => handleLongPress(item.citizenId, item.citizenName)}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.citizenName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.citizenName}</Text>
              <Text style={styles.lastMsg} numberOfLines={1}>
                {item.messages.length > 0 ? item.messages[item.messages.length - 1].text : 'No messages yet'}
              </Text>
            </View>
            {item.unreadForAdmin > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unreadForAdmin}</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  header: { backgroundColor: '#1a2a3a', paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20 },
  backText: { color: '#FF4757', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 12, color: '#8899aa', marginTop: 2 },
  list: { padding: 16 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2, alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1a2a3a', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#333' },
  lastMsg: { fontSize: 13, color: '#666', marginTop: 2 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#FF4757', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});
