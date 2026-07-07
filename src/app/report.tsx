import { useState, useEffect, Platform } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { reportAPI } from '@/services/api';
import * as Location from 'expo-location';

const crimeTypes = [
  { id: 'emergency', label: '🚨 Emergency' },
  { id: 'theft', label: '💰 Theft' },
  { id: 'robbery', label: '🔫 Robbery' },
  { id: 'assault', label: '👊 Assault' },
  { id: 'vandalism', label: '🔨 Vandalism' },
  { id: 'suspicious', label: '👀 Suspicious Activity' },
  { id: 'other', label: '📌 Other' },
];

export default function ReportScreen() {
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(true);

  useEffect(() => { getLocation(); }, []);

  const getLocation = async () => {
    setLocating(true);
    try {
      if (Platform.OS === 'web') {
        const pos = await new Promise<GeolocationPosition>((res, rej) => navigator.geolocation.getCurrentPosition(res, rej));
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, address: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}` });
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission needed'); return; }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const [addr] = await Location.reverseGeocodeAsync(loc.coords);
        setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude, address: addr ? `${addr.street || ''}, ${addr.city || ''}` : 'Location captured' });
      }
    } catch {} finally { setLocating(false); }
  };

  const handleSubmit = async () => {
    if (!type) { Alert.alert('Error', 'Select crime type'); return; }
    if (!description.trim()) { Alert.alert('Error', 'Describe the incident'); return; }
    if (!location) { Alert.alert('Error', 'Location required'); return; }
    setLoading(true);
    try {
      await reportAPI.create({ type, description, location });
      Alert.alert('Success', 'Report submitted', [{ text: 'OK', onPress: () => router.back() }]);
    } catch { Alert.alert('Error', 'Failed to submit'); } finally { setLoading(false); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Report a Crime</Text>

      <Text style={styles.label}>Crime Type</Text>
      <View style={styles.typeGrid}>
        {crimeTypes.map(ct => (
          <TouchableOpacity key={ct.id} style={[styles.typeBtn, type === ct.id && styles.typeBtnActive]} onPress={() => setType(ct.id)}>
            <Text style={[styles.typeText, type === ct.id && styles.typeTextActive]}>{ct.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Description</Text>
      <TextInput style={styles.textArea} placeholder="Describe what happened..." placeholderTextColor="#667" value={description} onChangeText={setDescription} multiline numberOfLines={5} />

      <Text style={styles.label}>Location</Text>
      {locating ? (
        <Text style={styles.info}>Getting location...</Text>
      ) : location ? (
        <View style={styles.locationBox}>
          <Text style={styles.locationText}>{location.address}</Text>
          <Text style={styles.coords}>{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.retryBtn} onPress={getLocation}><Text style={styles.retryText}>Get Location</Text></TouchableOpacity>
      )}

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
        <Text style={styles.submitText}>{loading ? 'Submitting...' : 'Submit Report'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: '800', color: '#1a2a3a', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 8, marginTop: 16 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd' },
  typeBtnActive: { backgroundColor: '#FF4757', borderColor: '#FF4757' },
  typeText: { fontSize: 14, color: '#333' },
  typeTextActive: { color: '#fff' },
  textArea: { backgroundColor: '#fff', borderRadius: 12, padding: 16, fontSize: 15, minHeight: 120, textAlignVertical: 'top', borderWidth: 1, borderColor: '#ddd' },
  info: { color: '#999', fontStyle: 'italic' },
  locationBox: { backgroundColor: '#e8f4fd', borderRadius: 12, padding: 16 },
  locationText: { fontSize: 14, color: '#333' },
  coords: { fontSize: 12, color: '#666', marginTop: 4 },
  retryBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#FF4757', borderRadius: 12, padding: 14, alignItems: 'center' },
  retryText: { color: '#FF4757', fontWeight: '600' },
  submitBtn: { backgroundColor: '#FF4757', borderRadius: 30, padding: 16, alignItems: 'center', marginTop: 24 },
  submitText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
