import { View, Text, TouchableOpacity, StyleSheet, Image, Dimensions, Animated, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const { width } = Dimensions.get('window');

export default function LandingScreen() {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -50, duration: 400, useNativeDriver: true }),
      ]).start(() => setShowSplash(false));
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading && user && !showSplash) {
      router.replace(user.role === 'admin' ? '/admin' : '/citizen');
    }
  }, [loading, user, showSplash]);

  if (showSplash) {
    return (
      <Animated.View style={[styles.splashContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <StatusBar style="light" />
        <View style={styles.splashCircleOuter}>
          <View style={styles.splashCircleInner}>
            <Image source={require('../../assets/images/police-icon.png')} style={styles.splashIcon} resizeMode="contain" />
          </View>
        </View>
        <Text style={styles.splashStation}>Area Command{'\n'}Police Station</Text>
        <Text style={styles.splashDivision}>Auchi Division</Text>
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <View style={styles.dividerDot} />
          <View style={styles.dividerLine} />
        </View>
        <Text style={styles.splashApp}>SpotCrime+</Text>
      </Animated.View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.topSection}>
        <View style={styles.badgeOuter}>
          <View style={styles.badgeInner}>
            <Image source={require('../../assets/images/police-icon.png')} style={styles.policeIcon} resizeMode="contain" />
          </View>
        </View>
        <Text style={styles.stationName}>Area Command{'\n'}Police Station</Text>
        <Text style={styles.divisionName}>Auchi Division</Text>
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <View style={styles.dividerDot} />
          <View style={styles.dividerLine} />
        </View>
        <Text style={styles.appName}>SpotCrime+</Text>
        <Text style={styles.tagline}>Crime Reporting & Emergency Response</Text>
      </View>

      <View style={styles.bottomSection}>
        <TouchableOpacity style={styles.citizenBtn} onPress={() => router.push({ pathname: '/login', params: { role: 'citizen' } })}>
          <Text style={styles.btnIcon}>👤</Text>
          <Text style={styles.btnLabel}>Citizen</Text>
          <Text style={styles.btnDesc}>Report a crime</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.adminBtn} onPress={() => router.push({ pathname: '/login', params: { role: 'admin' } })}>
          <Text style={styles.adminBtnIcon}>🛡️</Text>
          <Text style={styles.adminBtnLabel}>Admin</Text>
          <Text style={styles.adminBtnDesc}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/register')} style={styles.registerRow}>
          <Text style={styles.registerText}>Don't have an account? </Text>
          <Text style={styles.registerLink}>Register</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  splashContainer: { flex: 1, backgroundColor: '#0f1923', justifyContent: 'center', alignItems: 'center' },
  splashCircleOuter: {
    width: width * 0.65, height: width * 0.65, borderRadius: width * 0.325,
    backgroundColor: '#FF4757', justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    shadowColor: '#FF4757', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 30, elevation: 15,
  },
  splashCircleInner: {
    width: width * 0.55, height: width * 0.55, borderRadius: width * 0.275,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
  },
  splashIcon: { width: width * 0.4, height: width * 0.4, borderRadius: width * 0.2 },
  splashStation: { fontSize: 26, fontWeight: '800', color: '#fff', textAlign: 'center', lineHeight: 34 },
  splashDivision: { fontSize: 18, fontWeight: '600', color: '#FF4757', marginTop: 4, letterSpacing: 2 },
  splashApp: { fontSize: 28, fontWeight: '900', color: '#FF4757', letterSpacing: 3, marginTop: 10 },
  container: { flex: 1, backgroundColor: '#0f1923' },
  topSection: { flex: 1.3, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },
  badgeOuter: {
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: '#FF4757', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#FF4757', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 30, elevation: 15,
  },
  badgeInner: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
  },
  policeIcon: { width: 80, height: 80, borderRadius: 40 },
  stationName: { fontSize: 26, fontWeight: '800', color: '#fff', textAlign: 'center', lineHeight: 34, marginTop: 24 },
  divisionName: { fontSize: 18, fontWeight: '600', color: '#FF4757', marginTop: 4, letterSpacing: 2 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, width: width * 0.5 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#2a3a4a' },
  dividerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF4757', marginHorizontal: 10 },
  appName: { fontSize: 28, fontWeight: '900', color: '#FF4757', letterSpacing: 3 },
  tagline: { fontSize: 13, color: '#6a7a8a', marginTop: 6, letterSpacing: 0.5 },
  bottomSection: { paddingHorizontal: 30, paddingBottom: 50, gap: 14 },
  citizenBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF4757',
    borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20,
    shadowColor: '#FF4757', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  btnIcon: { fontSize: 24, marginRight: 14 },
  btnLabel: { color: '#fff', fontSize: 18, fontWeight: '700', flex: 1 },
  btnDesc: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  adminBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5,
  },
  adminBtnIcon: { fontSize: 24, marginRight: 14 },
  adminBtnLabel: { color: '#1a2a3a', fontSize: 18, fontWeight: '700', flex: 1 },
  adminBtnDesc: { color: '#6a7a8a', fontSize: 13 },
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  registerText: { color: '#6a7a8a', fontSize: 14 },
  registerLink: { color: '#FF4757', fontSize: 14, fontWeight: '600' },
});
