import { Stack } from 'expo-router';

export default function LearnLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0a0e17' } }}>
      <Stack.Screen name="[videoId]" />
    </Stack>
  );
}
