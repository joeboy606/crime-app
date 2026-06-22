import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !phone || !password) { Alert.alert('Error', 'Fill all fields'); return; }
    setLoading(true);
    try {
      await signup({ name, email, phone, password, role: 'citizen' });
      router.replace('/citizen');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Create Account</Text>
      <View style={styles.form}>
        <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#667" value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#667" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Phone Number" placeholderTextColor="#667" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <View style={styles.passwordRow}>
          <TextInput style={styles.passwordInput} placeholder="Password" placeholderTextColor="#667" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#8899aa" />
            <Text style={styles.eyeIcon}>{showPassword ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Please wait...' : 'Register'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.link}>Already have an account? Sign In</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a2a3a' },
  content: { justifyContent: 'center', padding: 24, flexGrow: 1 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 40 },
  form: { gap: 16 },
  input: { backgroundColor: '#2a3a4a', borderRadius: 12, padding: 16, fontSize: 16, color: '#fff' },
  passwordRow: { flexDirection: 'row', backgroundColor: '#2a3a4a', borderRadius: 12, alignItems: 'center' },
  passwordInput: { flex: 1, padding: 16, fontSize: 16, color: '#fff' },
  eyeBtn: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 4 },
  eyeIcon: { color: '#8899aa', fontSize: 13, fontWeight: '600' },
  button: { backgroundColor: '#FF4757', borderRadius: 30, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  link: { color: '#FF4757', textAlign: 'center', fontSize: 14 },
});
