import { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { reportAPI, locationAPI, chatAPI } from '@/services/api';
import { Report } from '@/types';

const typeLabels: Record<string, string> = { emergency: '🚨 Emergency', theft: '💰 Theft', robbery: '🔫 Robbery', assault: '👊 Assault', vandalism: '🔨 Vandalism', suspicious: '👀 Suspicious', other: '📌 Other' };
const tabs = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'report', label: 'Report', icon: '📝' },
  { key: 'sos', label: 'SOS', icon: '🆘' },
];

export default function CitizenScreen() {
  const { user, logout } = useAuth();
  const { getTotalUnread, getOrCreateConversation, deleteConversation, clearUnread } = useChat();
  const [reports, setReports] = useState<Report[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const locationSub = useRef<any>(null);

  useEffect(() => { loadReports(); startTracking(); return () => { if (locationSub.current) locationSub.current.remove(); }; }, []);

  const loadReports = async () => {
    try { const res = await reportAPI.getAll(); setReports(res.data); } catch {}
  };

  const onRefresh = async () => { setRefreshing(true); await loadReports(); setRefreshing(false); };

  const startTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 30000, distanceInterval: 10 }, loc => {
      locationAPI.update(loc.coords.latitude, loc.coords.longitude).catch(() => {});
    });
    locationSub.current = sub;
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Logout', onPress: async () => { await logout(); router.replace('/'); } }]);
  };

  const handleSOS = () => {
    Alert.alert('🚨 SOS Emergency', 'Send emergency alert to police with your current location?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send Alert', style: 'destructive', onPress: () => Alert.alert('Alert Sent', 'Police have been notified of your emergency. Help is on the way.') },
    ]);
  };

  const renderHome = () => (
    <>
      <TouchableOpacity style={styles.reportBtn} onPress={() => router.push('/report')}>
        <Text style={styles.reportBtnText}>+ Report a Crime</Text>
      </TouchableOpacity>
      <Text style={styles.sectionTitle}>My Reports</Text>
      <FlatList
        data={reports}
        keyExtractor={r => r._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No reports yet</Text>}
        renderItem={({ item }) => (
            <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.cardType}>{typeLabels[item.type] || item.type}</Text>
              <Text style={[styles.cardStatus, { color: item.status === 'resolved' ? '#2ecc71' : item.status === 'dispatched' ? '#f39c12' : '#e74c3c' }]}>{item.status}</Text>
            </View>
            <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
            <Text style={styles.cardDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            <Text style={styles.cardLocation}>📍 {item.location?.address || `${item.location?.lat?.toFixed(4)}, ${item.location?.lng?.toFixed(4)}`}</Text>
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => {
                Alert.alert('Delete Report', 'Are you sure?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: async () => {
                    try { await reportAPI.delete(item._id); loadReports(); } catch { Alert.alert('Error', 'Failed to delete'); }
                  }},
                ]);
              }}>
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </>
  );

  const renderReport = () => (
    <View style={styles.tabContent}>
      <Text style={styles.tabTitle}>Report a Crime</Text>
      <TouchableOpacity style={styles.goReportBtn} onPress={() => router.push('/report')}>
        <Text style={styles.goReportText}>Open Report Form</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSOS = () => (
    <View style={styles.sosContainer}>
      <TouchableOpacity style={styles.sosButton} onPress={handleSOS} activeOpacity={0.7}>
        <Text style={styles.sosIcon}>🆘</Text>
        <Text style={styles.sosText}>SOS</Text>
        <Text style={styles.sosSubtext}>Tap for Emergency</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hi, {user?.name?.split(' ')[0]}</Text>
          <Text style={styles.role}>Citizen</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeTab === 'home' && renderHome()}
        {activeTab === 'report' && renderReport()}
        {activeTab === 'sos' && renderSOS()}
      </View>

      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <TouchableOpacity key={tab.key} style={[styles.tabItem, activeTab === tab.key && styles.activeTab]} onPress={() => setActiveTab(tab.key)}>
            <Text style={[styles.tabIcon, activeTab === tab.key && styles.activeTabIcon]}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.activeTabLabel]}>{tab.label}</Text>
            {tab.key === 'sos' && <View style={styles.sosBadge} />}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.chatFab} onPress={async () => { const uid = user?.id || (user as any)?._id; if (uid) { clearUnread(uid, 'citizen'); await getOrCreateConversation(uid, user?.name || 'Citizen'); router.push({ pathname: '/chat' as any, params: { role: 'citizen', citizenId: uid, citizenName: user?.name || 'Citizen' } }); } }} activeOpacity={0.8}>
        <Text style={styles.chatFabIcon}>💬</Text>
        {getTotalUnread('citizen') > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{getTotalUnread('citizen')}</Text></View>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#1a2a3a' },
  greeting: { fontSize: 22, fontWeight: '700', color: '#fff' },
  role: { fontSize: 13, color: '#8899aa' },
  logout: { color: '#FF4757', fontWeight: '600' },
  content: { flex: 1 },
  reportBtn: { backgroundColor: '#FF4757', margin: 16, borderRadius: 30, padding: 16, alignItems: 'center' },
  reportBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700', paddingHorizontal: 20, marginBottom: 8, color: '#1a2a3a' },
  list: { padding: 16, paddingTop: 0 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardType: { fontSize: 14, fontWeight: '600', color: '#333' },
  cardStatus: { fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  cardDesc: { fontSize: 14, color: '#666', marginBottom: 8 },
  cardDate: { fontSize: 12, color: '#999' },
  cardLocation: { fontSize: 12, color: '#666', marginTop: 4 },
  cardActions: { flexDirection: 'row', marginTop: 8, gap: 8 },
  deleteBtn: { backgroundColor: '#e74c3c', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 14 },
  deleteBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  resolvedText: { color: '#2ecc71', fontWeight: '700', marginTop: 4 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
  tabContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  tabTitle: { fontSize: 22, fontWeight: '700', color: '#1a2a3a', marginBottom: 20 },
  goReportBtn: { backgroundColor: '#FF4757', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 30 },
  goReportText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  sosContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sosButton: { width: 200, height: 200, borderRadius: 100, backgroundColor: '#e74c3c', justifyContent: 'center', alignItems: 'center', shadowColor: '#e74c3c', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 30, elevation: 15 },
  sosIcon: { fontSize: 50, marginBottom: 4 },
  sosText: { fontSize: 28, fontWeight: '900', color: '#fff' },
  sosSubtext: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingBottom: 20, paddingTop: 8 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  activeTab: {},
  tabIcon: { fontSize: 22, opacity: 0.5 },
  activeTabIcon: { opacity: 1 },
  tabLabel: { fontSize: 11, color: '#999', marginTop: 2, fontWeight: '500' },
  activeTabLabel: { color: '#FF4757', fontWeight: '700' },
  sosBadge: { position: 'absolute', top: 0, right: 28, width: 8, height: 8, borderRadius: 4, backgroundColor: '#e74c3c' },
  chatFab: { position: 'absolute', bottom: 80, right: 16, width: 56, height: 56, borderRadius: 28, backgroundColor: '#FF4757', justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#FF4757', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  chatFabIcon: { fontSize: 24 },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#e74c3c', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
});
