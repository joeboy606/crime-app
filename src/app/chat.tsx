import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Alert, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useChat, ChatMessage } from '@/context/ChatContext';
import { chatAPI } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';

export default function ChatScreen() {
  const params = useLocalSearchParams<{ role: string; citizenId: string; citizenName: string }>();
  const role = params.role;
  const citizenId = params.citizenId;
  const citizenName = params.citizenName;
  const { conversations, sendMessage, editMessage, deleteMessage, clearUnread, deleteConversation } = useChat();
  const [text, setText] = useState('');
  const [editMsgId, setEditMsgId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const flatRef = useRef<FlatList>(null);
  const convId = citizenId || 'default';

  const conversation = conversations.find(c => c.citizenId === convId);
  const messages = conversation?.messages || [];

  const [pollKey, setPollKey] = useState(0);

  useEffect(() => {
    if (citizenId) clearUnread(citizenId, role as 'citizen' | 'admin');
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setPollKey(k => k + 1), 5000);
    return () => clearInterval(iv);
  }, []);

  const { loadConversations } = useChat();
  useEffect(() => { loadConversations(); }, [pollKey]);

  const handleSend = () => {
    if (!text.trim() || !citizenId) return;
    sendMessage(text, citizenId, role as 'citizen' | 'admin');
    setText('');
  };

  const handleLongPress = (msg: ChatMessage) => {
    if (msg.isDeleted) return;
    const isOwn = msg.sender === role;
    const options: { text: string; style?: 'destructive' | 'cancel'; onPress?: () => void }[] = [
      { text: 'Copy', onPress: () => { Clipboard.setStringAsync(msg.text); Alert.alert('Copied', 'Message copied to clipboard'); } },
    ];
    if (isOwn) {
      options.push({ text: 'Edit', onPress: () => { setEditMsgId(msg.id); setEditText(msg.text); } });
      options.push({ text: 'Delete', style: 'destructive', onPress: () => deleteMessage(citizenId, msg.id) });
    }
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Message Options', '', options);
  };

  const handleEditSave = () => {
    if (editMsgId && editText.trim() && citizenId) {
      editMessage(citizenId, editMsgId, editText.trim());
    }
    setEditMsgId(null);
    setEditText('');
  };

  const handleDeleteChat = () => {
    if (!citizenId) return;
    Alert.alert('Delete Chat', 'Delete this entire conversation?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await chatAPI.delete(citizenId); deleteConversation(citizenId); router.back(); } catch { Alert.alert('Error', 'Failed to delete chat'); }
      }},
    ]);
  };

  const handleHeaderLongPress = () => {
    if (role === 'admin') {
      Alert.alert('Chat Options', citizenName, [
        { text: 'Delete Chat', style: 'destructive', onPress: handleDeleteChat },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
      <TouchableOpacity activeOpacity={1} onLongPress={handleHeaderLongPress}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color="#FF4757" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDeleteChat} style={styles.deleteChatBtn}>
              <Ionicons name="trash-outline" size={16} color="#fff" />
              <Text style={styles.deleteChatText}> Delete</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.headerTitle}>Live Chat</Text>
          <Text style={styles.headerSub}>{citizenName || (role === 'admin' ? 'Station Admin' : 'Area Command Police Station')}</Text>
        </View>
      </TouchableOpacity>

      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={m => m.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => flatRef.current?.scrollToEnd()}
        renderItem={({ item }) => {
          const isOwn = item.sender === role;
          return (
          <TouchableOpacity onLongPress={() => handleLongPress(item)} activeOpacity={item.isDeleted ? 1 : 0.7}>
            <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble, item.isDeleted && (isOwn ? styles.ownDeleted : styles.otherDeleted)]}>
              <Text style={[styles.bubbleText, isOwn && styles.ownBubbleText, item.isDeleted && styles.deletedText]}>{item.text}</Text>
              <View style={styles.bubbleMeta}>
                {item.edited && <Text style={[styles.editedTag, isOwn && styles.editedTagMine]}>edited</Text>}
                {item.isDeleted && <Text style={[styles.editedTag, isOwn && styles.editedTagMine]}>deleted</Text>}
                <Text style={[styles.time, isOwn && styles.ownTime]}>{new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
            </View>
          </TouchableOpacity>
          );
        }}
      />

      <View style={styles.inputRow}>
        <TextInput style={styles.input} placeholder="Type a message..." placeholderTextColor="#999" value={text} onChangeText={setText} />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={editMsgId !== null} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => { setEditMsgId(null); setEditText(''); }}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Message</Text>
            <TextInput style={styles.modalInput} value={editText} onChangeText={setEditText} autoFocus multiline />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setEditMsgId(null); setEditText(''); }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleEditSave}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  header: { backgroundColor: '#1a2a3a', paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  backBtn: {},
  deleteChatBtn: { backgroundColor: '#e74c3c', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 10 },
  deleteChatText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  backText: { color: '#FF4757', fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: '#8899aa', marginTop: 2 },
  list: { padding: 16, flexGrow: 1 },
  bubble: { maxWidth: '75%', padding: 12, borderRadius: 16, marginBottom: 10 },
  otherBubble: { backgroundColor: '#fff', alignSelf: 'flex-start', borderBottomLeftRadius: 4, elevation: 1 },
  ownBubble: { backgroundColor: '#FF4757', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 14, color: '#333' },
  ownBubbleText: { color: '#fff' },
  otherDeleted: { backgroundColor: '#e0e0e0', opacity: 0.7 },
  ownDeleted: { backgroundColor: '#ff6b6b', opacity: 0.7 },
  deletedText: { fontStyle: 'italic', textDecorationLine: 'line-through' },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  editedTag: { fontSize: 10, color: '#999', fontStyle: 'italic', marginRight: 6 },
  editedTagMine: { color: 'rgba(255,255,255,0.6)' },
  time: { fontSize: 10, color: '#999', alignSelf: 'flex-end' },
  ownTime: { color: 'rgba(255,255,255,0.7)' },
  inputRow: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: '#e0e0e0', backgroundColor: '#fff' },
  input: { flex: 1, backgroundColor: '#f0f2f5', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14 },
  sendBtn: { backgroundColor: '#FF4757', borderRadius: 24, paddingHorizontal: 20, justifyContent: 'center', marginLeft: 8 },
  sendText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 24 },
  modalContent: { backgroundColor: '#1a2a3a', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 12 },
  modalInput: { backgroundColor: '#2a3a4a', borderRadius: 12, padding: 14, fontSize: 15, color: '#fff', minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  modalCancel: { paddingVertical: 10, paddingHorizontal: 20 },
  modalCancelText: { color: '#8899aa', fontWeight: '600', fontSize: 15 },
  modalSave: { backgroundColor: '#FF4757', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
  modalSaveText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
