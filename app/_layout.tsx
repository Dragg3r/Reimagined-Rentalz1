import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

export default function RootLayout() {
  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen 
          name="index" 
          options={{ 
            title: 'AK13',
            headerStyle: { backgroundColor: '#dc2626' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' }
          }} 
        />
        <Stack.Screen 
          name="register" 
          options={{ 
            title: 'Customer Registration',
            headerStyle: { backgroundColor: '#dc2626' },
            headerTintColor: '#fff'
          }} 
        />
        <Stack.Screen 
          name="login" 
          options={{ 
            title: 'Customer Login',
            headerStyle: { backgroundColor: '#dc2626' },
            headerTintColor: '#fff'
          }} 
        />
        <Stack.Screen 
          name="rental" 
          options={{ 
            title: 'Rental Booking',
            headerStyle: { backgroundColor: '#dc2626' },
            headerTintColor: '#fff'
          }} 
        />
        <Stack.Screen 
          name="staff" 
          options={{ 
            title: 'Staff Dashboard',
            headerStyle: { backgroundColor: '#dc2626' },
            headerTintColor: '#fff'
          }} 
        />
      </Stack>
    </View>
  );
}