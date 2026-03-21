import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <SafeAreaView className="flex-1 bg-[#1F1F1F]">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="mb-6 mt-2 text-2xl font-semibold text-white">
            Login
          </Text>

          <View className="mx-auto w-full max-w-[360px] rounded-sm bg-white px-5 py-6">
            <View className="mb-4 items-center">
              <Ionicons name="bus" size={28} color="#0B66FF" />
              <Text className="mt-1 text-[14px] font-semibold text-[#0B66FF]">
                BusHere
              </Text>
              <Text className="mt-1 text-[11px] text-[#8E8E93]">
                Welcome back! Let's get you moving
              </Text>
            </View>

            <Text className="mb-1 text-[11px] font-medium text-[#444444]">
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              className="mb-3 rounded-md border border-[#D9D9D9] px-3 py-2 text-[12px] text-[#222222]"
              placeholderTextColor="#B0B0B0"
            />

            <Text className="mb-1 text-[11px] font-medium text-[#444444]">
              Password
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="********"
              secureTextEntry
              className="rounded-md border border-[#D9D9D9] px-3 py-2 text-[12px] text-[#222222]"
              placeholderTextColor="#B0B0B0"
            />

            <View className="mb-3 mt-1 items-end">
              <Pressable>
                <Text className="text-[10px] font-medium text-[#0B66FF]">
                  Forgot Password?
                </Text>
              </Pressable>
            </View>

            <Pressable className="items-center rounded-md bg-[#0B66FF] py-2.5">
              <Text className="text-[12px] font-semibold text-white">
                Login
              </Text>
            </Pressable>

            <View className="my-3 items-center">
              <Text className="text-[10px] text-[#B0B0B0]">or</Text>
            </View>

            <Pressable className="mb-2 items-center rounded-md border border-[#D9D9D9] py-2">
              <Text className="text-[11px] font-medium text-[#333333]">
                Continue with Google
              </Text>
            </Pressable>

            <Pressable className="items-center rounded-md border border-[#D9D9D9] py-2">
              <Text className="text-[11px] font-medium text-[#333333]">
                Continue with Facebook
              </Text>
            </Pressable>

            <View className="mt-5 flex-row items-center justify-center">
              <Text className="text-[10px] text-[#B0B0B0]">
                Don&apos;t have an account?{" "}
              </Text>
              <Pressable>
                <Text className="text-[10px] font-semibold text-[#0B66FF]">
                  Sign Up
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
