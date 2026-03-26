import { FontAwesome5, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function SignupScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.brandBlock}>
            <MaterialIcons name="directions-bus" size={34} color="#1178e8" />
            <Text style={styles.brandName}>BusHere</Text>
            <Text style={styles.welcomeText}>
              Welcome back! Let&apos;s get you moving.
            </Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrap}>
              <MaterialIcons name="email" size={16} color="#b6b6b6" />
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
              <MaterialIcons name="lock-outline" size={16} color="#b6b6b6" />
              <TextInput
                placeholder="********"
                placeholderTextColor="#b9b9b9"
                secureTextEntry
                style={styles.input}
              />
            </View>
          </View>

          <TouchableOpacity 
            style={styles.primaryButton} 
            activeOpacity={0.88}
            onPress={() => router.replace("/screens/home")}
          >
            <Text style={styles.primaryButtonText}>Sign Up</Text>
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.socialButton} activeOpacity={0.88}>
            <View style={styles.socialIconBox}>
              <Image
                source={require("../../assets/images/google.jpg")}
                style={styles.googleImage}
              />
            </View>
            <Text style={styles.socialButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialButton} activeOpacity={0.88}>
            <View style={styles.socialIconBox}>
              <FontAwesome5 name="facebook" size={20} color="#1877F2" />
            </View>
            <Text style={styles.socialButtonText}>Continue with Facebook</Text>
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/auth/login")}
            >
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
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
  card: {
    flex: 1,
    backgroundColor: "#efefef",
    borderWidth: 2,
    borderColor: "#0c86ff",
    borderRadius: 2,
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 26,
  },
  brandBlock: {
    alignItems: "center",
    marginBottom: 22,
  },
  brandName: {
    marginTop: 6,
    color: "#1178e8",
    fontSize: 28,
    fontWeight: "700",
  },
  welcomeText: {
    marginTop: 10,
    color: "#878787",
    fontSize: 13,
    textAlign: "center",
  },
  formGroup: {
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    color: "#1e1e1e",
    fontWeight: "500",
    marginBottom: 6,
  },
  inputWrap: {
    minHeight: 38,
    backgroundColor: "#efefef",
    borderColor: "#bcbcbc",
    borderWidth: 1,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    color: "#3d3d3d",
    fontSize: 12,
    paddingVertical: 0,
  },
  primaryButton: {
    backgroundColor: "#1178e8",
    borderRadius: 8,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    marginBottom: 12,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#c9c9c9",
  },
  dividerText: {
    color: "#979797",
    fontSize: 12,
  },
  socialButton: {
    minHeight: 34,
    borderColor: "#bcbcbc",
    borderWidth: 1,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginBottom: 8,
  },
  socialButtonText: {
    color: "#181818",
    fontSize: 12,
    fontWeight: "500",
  },
  socialIconBox: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  googleImage: {
    width: 20,
    height: 20,
    resizeMode: "contain",
  },
  footerRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  footerText: {
    color: "#b6b6b6",
    fontSize: 12,
  },
  loginLink: {
    color: "#1178e8",
    fontSize: 12,
    fontWeight: "500",
  },
});
