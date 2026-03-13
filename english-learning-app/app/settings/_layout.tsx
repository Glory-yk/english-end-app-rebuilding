import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0a0e17' } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="profiles" />
      <Stack.Screen name="parental" />
    </Stack>
  );
}
