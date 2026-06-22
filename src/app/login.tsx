import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const SAVED_EMAIL_KEY = 'saved_email';

export default function LoginScreen() {
  const { role } = useLocalSearchParams<{ role: string }>();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await SecureStore.getItemAsync(SAVED_EMAIL_KEY + (role ? `_${role}` : ''));
      if (saved) setEmail(saved);
    })();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert('Error', 'Fill all fields'); return; }
    setLoading(true);
    try {
      await login(email, password);
      await SecureStore.setItemAsync(SAVED_EMAIL_KEY + (role ? `_${role}` : ''), email);
      router.replace(role === 'admin' ? '/admin' : '/citizen');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{role === 'admin' ? 'Admin Login' : 'Citizen Login'}</Text>
      <View style={styles.form}>
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#667" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <View style={styles.passwordRow}>
          <TextInput style={styles.passwordInput} placeholder="Password" placeholderTextColor="#667" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#8899aa" />
            <Text style={styles.eyeIcon}>{showPassword ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Please wait...' : 'Sign In'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/register')}>
          <Text style={styles.link}>Don't have an account? Register</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2a3a', justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 40 },
  form: { gap: 16 },
  input: { backgroundColor: '#2a3a4a', borderRadius: 12, padding: 16, fontSize: 16, color: '#fff' },
  passwordRow: { flexDirection: 'row', backgroundColor: '#2a3a4a', borderRadius: 12, alignItems: 'center' },
  passwordInput: { flex: 1, padding: 16, fontSize: 16, color: '#fff' },
  eyeBtn: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 4 },
  eyeIcon: { color: '#8899aa', fontSize: 13, fontWeight: '600' },
  button: { backgroundColor: '#FF4757', borderRadius: 30, padding: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  link: { color: '#FF4757', textAlign: 'center', fontSize: 14 },
  back: { color: '#8899aa', textAlign: 'center', fontSize: 14 },
});
