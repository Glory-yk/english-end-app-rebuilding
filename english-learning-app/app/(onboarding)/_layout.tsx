import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0a0e17' } }}>
      <Stack.Screen name="profile-select" />
      <Stack.Screen name="age-group" />
      <Stack.Screen name="level-test" />
    </Stack>
  );
}
