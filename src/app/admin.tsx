import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, RefreshControl, Linking } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { reportAPI, authAPI, locationAPI } from '@/services/api';
import { Report } from '@/types';

const typeLabels: Record<string, string> = { emergency: '🚨 Emergency', theft: '💰 Theft', robbery: '🔫 Robbery', assault: '👊 Assault', vandalism: '🔨 Vandalism', suspicious: '👀 Suspicious', other: '📌 Other' };
const tabs = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'users', label: 'Users', icon: '👥' },
  { key: 'reports', label: 'Reports', icon: '📋' },
];

export default function AdminScreen() {
  const { user, logout } = useAuth();
  const { getTotalUnread } = useChat();
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [liveLocations, setLiveLocations] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => { loadReports(); loadUsers(); loadLocations(); const iv = setInterval(loadLocations, 15000); return () => clearInterval(iv); }, []);

  const loadLocations = async () => {
    try { const res = await locationAPI.getAll(); setLiveLocations(res.data); } catch {}
  };

  const loadReports = async () => {
    try { const res = await reportAPI.getAll(); setReports(res.data); } catch {}
  };

  const loadUsers = async () => {
    try { const res = await authAPI.getUsers(); setUsers(res.data.filter((u: any) => u.role === 'citizen')); } catch {}
  };

  const onRefresh = async () => { setRefreshing(true); await loadReports(); await loadUsers(); setRefreshing(false); };

  const handleStatus = async (id: string, status: string) => {
    try { await reportAPI.updateStatus(id, status); loadReports(); } catch { Alert.alert('Error', 'Failed'); }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Logout', onPress: async () => { await logout(); router.replace('/'); } }]);
  };

  const filtered = filter === 'all' ? reports : reports.filter(r => r.status === filter);

  const reportCard = (item: Report) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onLongPress={() => {
      Alert.alert('Delete Report', `Delete this ${item.type} report by ${item.citizenName}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => { try { await reportAPI.delete(item._id); loadReports(); } catch { Alert.alert('Error', 'Failed to delete report'); } } },
      ]);
    }}>
      <View style={styles.cardTop}>
        <Text style={styles.cardType}>{typeLabels[item.type] || item.type}</Text>
        <Text style={[styles.cardStatus, { color: item.status === 'resolved' ? '#2ecc71' : item.status === 'dispatched' ? '#f39c12' : '#e74c3c' }]}>{item.status}</Text>
      </View>
      <Text style={styles.reporter}>By: {item.citizenName}</Text>
      <Text style={styles.desc}>{item.description}</Text>
      <TouchableOpacity onPress={() => { const ll = item.location; if (ll?.lat && ll?.lng) Linking.openURL(`https://maps.google.com/maps?q=${ll.lat},${ll.lng}`); }}>
        <Text style={styles.location}>📍 {item.location?.address || `${item.location?.lat?.toFixed(4)}, ${item.location?.lng?.toFixed(4)}`}</Text>
      </TouchableOpacity>
      <Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>
      <View style={styles.actions}>
        {item.status === 'pending' && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#f39c12' }]} onPress={() => handleStatus(item._id, 'dispatched')}>
            <Text style={styles.actionText}>Dispatch</Text>
          </TouchableOpacity>
        )}
        {item.status === 'dispatched' && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#2ecc71' }]} onPress={() => handleStatus(item._id, 'resolved')}>
            <Text style={styles.actionText}>Resolve</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderHome = () => (
    <>
      <View style={styles.filters}>
        {['all', 'pending', 'dispatched', 'resolved'].map(f => (
          <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.activeFilter]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.activeFilterText]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={r => r._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={liveLocations.length > 0 ? (
          <View style={styles.liveSection}>
            <View style={styles.liveHeader}>
              <View style={styles.liveDot} />
              <Text style={styles.liveTitle}>Live Locations</Text>
              <Text style={styles.liveCount}>{liveLocations.length} active</Text>
            </View>
            {liveLocations.map(loc => (
              <TouchableOpacity key={loc.citizenId} style={styles.liveCard} onPress={() => Linking.openURL(`https://maps.google.com/maps?q=${loc.lat},${loc.lng}`)}>
                <View style={styles.liveAvatar}>
                  <Text style={styles.liveAvatarText}>{loc.citizenName?.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.liveInfo}>
                  <Text style={styles.liveName}>{loc.citizenName}</Text>
                  <Text style={styles.liveCoords}>{loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</Text>
                </View>
                <Text style={styles.liveArrow}>📍</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
        ListEmptyComponent={<Text style={styles.empty}>No reports</Text>}
        renderItem={({ item }) => reportCard(item)}
      />
    </>
  );

  const renderUsers = () => (
    <FlatList
      data={users}
      keyExtractor={u => u._id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.countCard}>
          <Text style={styles.countNum}>{users.length}</Text>
          <Text style={styles.countLabel}>Registered Citizens</Text>
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>No users registered</Text>}
      renderItem={({ item: u }) => (
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Text style={styles.avatarText}>{u.name?.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{u.name}</Text>
            <Text style={styles.userEmail}>{u.email}</Text>
            <Text style={styles.userPhone}>{u.phone || 'No phone'}</Text>
          </View>
        </View>
      )}
    />
  );

  const renderReports = () => (
    <FlatList
      data={reports}
      keyExtractor={r => r._id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.countCard}>
          <Text style={styles.countNum}>{reports.length}</Text>
          <Text style={styles.countLabel}>Total Reports</Text>
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>No reports</Text>}
      renderItem={({ item }) => reportCard(item)}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Admin</Text>
          <Text style={styles.role}>Area Command, Auchi Division</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeTab === 'home' && renderHome()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'reports' && renderReports()}
      </View>

      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <TouchableOpacity key={tab.key} style={[styles.tabItem, activeTab === tab.key && styles.activeTab]} onPress={() => setActiveTab(tab.key)}>
            <Text style={[styles.tabIcon, activeTab === tab.key && styles.activeTabIcon]}>{tab.icon}</Text>
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.activeTabLabel]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.chatFab} onPress={() => router.push('/chat-list')} activeOpacity={0.8}>
        <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
        {getTotalUnread('admin') > 0 && (
          <View style={styles.badge}><Text style={styles.badgeText}>{getTotalUnread('admin')}</Text></View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#1a2a3a' },
  greeting: { fontSize: 22, fontWeight: '700', color: '#fff' },
  role: { fontSize: 12, color: '#8899aa' },
  logout: { color: '#FF4757', fontWeight: '600' },
  content: { flex: 1 },
  filters: { flexDirection: 'row', padding: 16, paddingBottom: 0, gap: 8 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#ddd' },
  activeFilter: { backgroundColor: '#FF4757' },
  filterText: { fontSize: 13, fontWeight: '500', color: '#666' },
  activeFilterText: { color: '#fff' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  cardType: { fontSize: 14, fontWeight: '600', color: '#333' },
  cardStatus: { fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  reporter: { fontSize: 13, color: '#666', marginBottom: 4 },
  desc: { fontSize: 14, color: '#333', marginBottom: 8 },
  location: { fontSize: 12, color: '#666', marginBottom: 4 },
  date: { fontSize: 12, color: '#999', marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
  countCard: { backgroundColor: '#1a2a3a', borderRadius: 12, padding: 24, alignItems: 'center', marginBottom: 16 },
  countNum: { fontSize: 48, fontWeight: '900', color: '#FF4757' },
  countLabel: { fontSize: 14, color: '#8899aa', marginTop: 4 },
  userCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2, alignItems: 'center' },
  userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1a2a3a', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '600', color: '#333' },
  userEmail: { fontSize: 13, color: '#666' },
  userPhone: { fontSize: 12, color: '#999', marginTop: 2 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingBottom: 20, paddingTop: 8 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  activeTab: {},
  tabIcon: { fontSize: 22, opacity: 0.5 },
  activeTabIcon: { opacity: 1 },
  tabLabel: { fontSize: 11, color: '#999', marginTop: 2, fontWeight: '500' },
  activeTabLabel: { color: '#FF4757', fontWeight: '700' },
  liveSection: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2 },
  liveHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2ecc71', marginRight: 8 },
  liveTitle: { fontSize: 16, fontWeight: '700', color: '#1a2a3a', flex: 1 },
  liveCount: { fontSize: 12, color: '#8899aa', fontWeight: '500' },
  liveCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f0f2f5' },
  liveAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1a2a3a', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  liveAvatarText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  liveInfo: { flex: 1 },
  liveName: { fontSize: 14, fontWeight: '600', color: '#333' },
  liveCoords: { fontSize: 12, color: '#666', marginTop: 2 },
  liveArrow: { fontSize: 18 },
  chatFab: { position: 'absolute', bottom: 80, right: 16, width: 56, height: 56, borderRadius: 28, backgroundColor: '#FF4757', justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#FF4757', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#e74c3c', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
});
