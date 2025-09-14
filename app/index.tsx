import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Image, 
  SafeAreaView,
  StatusBar 
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#dc2626" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <Ionicons name="car-sport" size={24} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>AK13</Text>
        </View>
        <View style={styles.headerRight}>
          <Ionicons name="notifications-outline" size={20} color="#666" />
          <View style={styles.akLogo}>
            {/* AK13 Logo placeholder */}
            <Text style={styles.akText}>AK</Text>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* DKL Logo */}
        <View style={styles.welcomeSection}>
          <View style={styles.dklLogoContainer}>
            <Text style={styles.dklLogo}>DKL</Text>
          </View>
          <Text style={styles.title}>Drive KL Rental System</Text>
          <Text style={styles.subtitle}>By Akib</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <Link href="/login" asChild>
            <TouchableOpacity style={[styles.button, styles.primaryButton]}>
              <Ionicons name="person-circle-outline" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Existing Customer</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/register" asChild>
            <TouchableOpacity style={[styles.button, styles.secondaryButton]}>
              <Ionicons name="person-add-outline" size={20} color="#fff" />
              <Text style={styles.secondaryButtonText}>New Customer</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/staff" asChild>
            <TouchableOpacity style={[styles.button, styles.outlineButton]}>
              <Ionicons name="business-outline" size={20} color="#374151" />
              <Text style={styles.outlineButtonText}>DKL Staff Login</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: 40,
    height: 40,
    backgroundColor: 'linear-gradient(135deg, #dc2626, #b91c1c)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#dc2626',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  akLogo: {
    width: 40,
    height: 40,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  akText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 40,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 60,
  },
  dklLogoContainer: {
    width: 120,
    height: 80,
    backgroundColor: '#e2e8f0',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  dklLogo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#64748b',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#dc2626',
  },
  secondaryButton: {
    backgroundColor: '#b91c1c',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#d1d5db',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  outlineButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
});