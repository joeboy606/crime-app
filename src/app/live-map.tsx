import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { locationAPI } from '@/services/api';

export default function LiveMapScreen() {
  const [citizens, setCitizens] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      try { const res = await locationAPI.getAll(); setCitizens(res.data); } catch {}
    };
    fetch();
    const iv = setInterval(fetch, 15000);
    return () => clearInterval(iv);
  }, []);

  if (citizens.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>Waiting for citizen locations...</Text>
      </View>
    );
  }

  const region = {
    latitude: citizens[0].lat,
    longitude: citizens[0].lng,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={region}>
        {citizens.map(c => (
          <Marker key={c.citizenId} coordinate={{ latitude: c.lat, longitude: c.lng }} title={c.citizenName} pinColor="#FF4757" />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2a3a', justifyContent: 'center', alignItems: 'center' },
  map: { width: '100%', height: '100%' },
  empty: { color: '#8899aa', fontSize: 16 },
});
