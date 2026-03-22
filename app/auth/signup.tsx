import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { Link } from "expo-router";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function SignupScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.topTitle}>Signup</Text>

        <View style={styles.card}>
          <View style={styles.brandBlock}>
            <MaterialIcons name="directions-bus" size={48} color="#1178e8" />
            <Text style={styles.brandName}>BusHere</Text>
            <Text style={styles.welcomeText}>Welcome back! Let&apos;s get you moving.</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrap}>
              <MaterialIcons name="email" size={20} color="#b6b6b6" />
              <TextInput
                placeholder="your@email.com"
                placeholderTextColor="#b9b9b9"
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrap}>
              <MaterialIcons name="lock-outline" size={20} color="#b6b6b6" />
              <TextInput
                placeholder="********"
                placeholderTextColor="#b9b9b9"
                secureTextEntry
                style={styles.input}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.primaryButton} activeOpacity={0.88}>
            <Text style={styles.primaryButtonText}>Sign Up</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.socialButton} activeOpacity={0.88}>
            <FontAwesome name="google" size={22} color="#111111" />
            <Text style={styles.socialButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialButton} activeOpacity={0.88}>
            <FontAwesome name="facebook-official" size={22} color="#111111" />
            <Text style={styles.socialButtonText}>Continue with Facebook</Text>
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Link href="./login" asChild>
              <TouchableOpacity activeOpacity={0.8}>
                <Text style={styles.loginLink}>Login</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#1f1f1f",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 2,
    paddingVertical: 8,
  },
  topTitle: {
    color: "#7ca4cc",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 6,
    marginBottom: 6,
  },
  card: {
    flex: 1,
    backgroundColor: "#efefef",
    borderWidth: 2,
    borderColor: "#0c86ff",
    borderRadius: 2,
    paddingHorizontal: 24,
    paddingTop: 44,
    paddingBottom: 28,
  },
  brandBlock: {
    alignItems: "center",
    marginBottom: 36,
  },
  brandName: {
    marginTop: 8,
    color: "#1178e8",
    fontSize: 34,
    fontWeight: "800",
  },
  welcomeText: {
    marginTop: 14,
    color: "#878787",
    fontSize: 15,
    textAlign: "center",
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 15,
    color: "#1e1e1e",
    fontWeight: "500",
    marginBottom: 8,
  },
  inputWrap: {
    minHeight: 52,
    backgroundColor: "#efefef",
    borderColor: "#bcbcbc",
    borderWidth: 2,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    color: "#3d3d3d",
    fontSize: 16,
    paddingVertical: 0,
  },
  primaryButton: {
    marginTop: 14,
    backgroundColor: "#1178e8",
    borderRadius: 14,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "600",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
    marginBottom: 14,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#c9c9c9",
  },
  dividerText: {
    color: "#979797",
    fontSize: 16,
  },
  socialButton: {
    minHeight: 52,
    borderColor: "#bcbcbc",
    borderWidth: 2,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 10,
  },
  socialButtonText: {
    color: "#181818",
    fontSize: 18,
    fontWeight: "500",
  },
  footerRow: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  footerText: {
    color: "#b6b6b6",
    fontSize: 13,
  },
  loginLink: {
    color: "#1178e8",
    fontSize: 13,
    fontWeight: "500",
  },
});
