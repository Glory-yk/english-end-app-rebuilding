import { Stack } from 'expo-router';

export default function ReviewLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0a0e17' } }}>
      <Stack.Screen name="flashcard" />
      <Stack.Screen name="result" />
    </Stack>
  );
}
