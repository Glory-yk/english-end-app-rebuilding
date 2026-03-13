import { Stack } from 'expo-router';

export default function KidsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FFF8E7' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="home" />
      <Stack.Screen name="watch" />
      <Stack.Screen name="sing-along" />
      <Stack.Screen name="stickers" />
    </Stack>
  );
}
