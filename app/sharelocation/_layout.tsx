import { Stack } from "expo-router";

export default function ShareLocationLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="screens/goliveScreen" />
      <Stack.Screen name="screens/golivemapScreen" />
    </Stack>
  );
}
