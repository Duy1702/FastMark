import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import { clearAuthFeedback, loginUser, registerUser, socialLogin } from './authSlice';

// Required for Expo OAuth redirect handling
WebBrowser.maybeCompleteAuthSession();

// ──────────────────────────────────────────────────────────
// THAY CÁC GIÁ TRỊ NÀY BẰNG CLIENT IDs THỰC TẾ CỦA BẠN
// Google: Lấy từ Firebase Console > Authentication > Sign-in method > Google > Web SDK config
// Facebook: Lấy từ developers.facebook.com > App ID
// ──────────────────────────────────────────────────────────
const GOOGLE_WEB_CLIENT_ID = '356316104950-799dkpvcf6br1e8drjvbeukvfu1ovcsu.apps.googleusercontent.com';
const FACEBOOK_APP_ID = 'YOUR_FACEBOOK_APP_ID';

// Facebook useAuthRequest expects a numeric string ID, using a dummy one to prevent rendering crash on Android
const SAFE_FACEBOOK_APP_ID = FACEBOOK_APP_ID === 'YOUR_FACEBOOK_APP_ID' ? '123456789012345' : FACEBOOK_APP_ID;

const emptyForm = {
  email: '',
  password: '',
  confirmPassword: '',
};

export default function AuthScreen() {
  const dispatch = useDispatch();
  const { actionStatus, configError, error, successMessage } = useSelector(
    (state) => state.auth
  );
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(emptyForm);
  const [localError, setLocalError] = useState('');

  const isRegister = mode === 'register';
  const isLoading = actionStatus === 'loading';
  const isDisabled = isLoading || Boolean(configError);

  // ── Google OAuth ─────────────────────────────────────────
  const [, googleResponse, promptGoogle] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_WEB_CLIENT_ID,
    responseType: 'id_token',
    usePKCE: false,
  });

  // ── Facebook OAuth ───────────────────────────────────────
  const [, facebookResponse, promptFacebook] = Facebook.useAuthRequest({
    clientId: SAFE_FACEBOOK_APP_ID,
  });

  const handleGoogleLogin = () => {
    if (GOOGLE_WEB_CLIENT_ID.includes('YOUR_')) {
      setLocalError('Vui lòng cấu hình GOOGLE_WEB_CLIENT_ID thực tế.');
      return;
    }
    try {
      promptGoogle();
    } catch (err) {
      setLocalError('Không thể mở đăng nhập Google: ' + err.message);
    }
  };

  const handleFacebookLogin = () => {
    if (FACEBOOK_APP_ID === 'YOUR_FACEBOOK_APP_ID') {
      setLocalError('Vui lòng cấu hình FACEBOOK_APP_ID thực tế.');
      return;
    }
    try {
      promptFacebook();
    } catch (err) {
      setLocalError('Không thể mở đăng nhập Facebook: ' + err.message);
    }
  };

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const { id_token } = googleResponse.params;
      if (id_token) {
        dispatch(socialLogin({ provider: 'google', token: id_token }));
      }
    }
  }, [googleResponse, dispatch]);

  useEffect(() => {
    if (facebookResponse?.type === 'success') {
      const { access_token } = facebookResponse.params;
      if (access_token) {
        dispatch(socialLogin({ provider: 'facebook', token: access_token }));
      }
    }
  }, [facebookResponse, dispatch]);

  useEffect(() => {
    setLocalError('');
    dispatch(clearAuthFeedback());
  }, [dispatch, mode]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setLocalError('');
  }

  function validateForm() {
    if (!form.email.trim() || !form.password) {
      return 'Vui lòng nhập email và mật khẩu.';
    }
    if (isRegister && form.password !== form.confirmPassword) {
      return 'Mật khẩu xác nhận chưa khớp.';
    }
    if (form.password.length < 6) {
      return 'Mật khẩu cần tối thiểu 6 ký tự.';
    }
    return '';
  }

  function handleSubmit() {
    const validationError = validateForm();
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    dispatch((isRegister ? registerUser : loginUser)(form));
  }

  const displayError = configError || localError || error;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <View style={styles.brandIcon}>
            <Text style={styles.brandIconText}>F</Text>
          </View>
          <Text style={styles.brandName}>Fastmark</Text>
          <Text style={styles.brandTagline}>Khám phá địa điểm quanh bạn</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Tab Switch */}
          <View style={styles.tabRow}>
            <Pressable
              style={[styles.tab, !isRegister && styles.tabActive]}
              onPress={() => setMode('login')}
            >
              <Text style={[styles.tabText, !isRegister && styles.tabTextActive]}>
                Đăng nhập
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, isRegister && styles.tabActive]}
              onPress={() => setMode('register')}
            >
              <Text style={[styles.tabText, isRegister && styles.tabTextActive]}>
                Đăng ký
              </Text>
            </Pressable>
          </View>

          {/* Email / Password fields */}
          <LabeledInput
            label="Email"
            value={form.email}
            onChangeText={(v) => updateField('email', v)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="you@example.com"
          />
          <LabeledInput
            label="Mật khẩu"
            value={form.password}
            onChangeText={(v) => updateField('password', v)}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            placeholder="Tối thiểu 6 ký tự"
          />
          {isRegister && (
            <LabeledInput
              label="Xác nhận mật khẩu"
              value={form.confirmPassword}
              onChangeText={(v) => updateField('confirmPassword', v)}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="new-password"
              placeholder="Nhập lại mật khẩu"
            />
          )}

          {/* Error / Success */}
          {displayError ? (
            <View style={styles.alertBox}>
              <Text style={styles.alertText}>{displayError}</Text>
            </View>
          ) : null}
          {successMessage ? (
            <View style={[styles.alertBox, styles.alertBoxSuccess]}>
              <Text style={[styles.alertText, styles.alertTextSuccess]}>{successMessage}</Text>
            </View>
          ) : null}

          {/* Primary CTA */}
          <Pressable
            accessibilityRole="button"
            disabled={isDisabled}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || isLoading) && styles.primaryButtonPressed,
              isDisabled && styles.primaryButtonDisabled,
            ]}
            onPress={handleSubmit}
          >
            <Text style={styles.primaryButtonText}>
              {isLoading
                ? 'Đang xử lý...'
                : isRegister
                  ? 'Tạo tài khoản'
                  : 'Đăng nhập'}
            </Text>
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>hoặc tiếp tục với</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Buttons */}
          <View style={styles.socialRow}>
            {/* Google */}
            <Pressable
              style={({ pressed }) => [
                styles.socialButton,
                pressed && styles.socialButtonPressed,
                isDisabled && styles.socialButtonDisabled,
              ]}
              disabled={isDisabled}
              onPress={handleGoogleLogin}
              accessibilityLabel="Đăng nhập bằng Google"
            >
              {/* Google "G" logo using colored letters */}
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.socialButtonText}>Google</Text>
            </Pressable>

            {/* Facebook */}
            <Pressable
              style={({ pressed }) => [
                styles.socialButton,
                styles.facebookButton,
                pressed && styles.socialButtonPressed,
                isDisabled && styles.socialButtonDisabled,
              ]}
              disabled={isDisabled}
              onPress={handleFacebookLogin}
              accessibilityLabel="Đăng nhập bằng Facebook"
            >
              <Text style={styles.facebookIcon}>f</Text>
              <Text style={styles.facebookButtonText}>Facebook</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.footerNote}>
          Bằng cách đăng nhập, bạn đồng ý với Điều khoản sử dụng của Fastmark.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function LabeledInput({ label, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor="#94a3b8"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f0faf8',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },

  // ── Brand Header ─────────────────────────────────────────
  brandHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  brandIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#0f766e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  brandIconText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
  },
  brandName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  brandTagline: {
    marginTop: 4,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },

  // ── Card ─────────────────────────────────────────────────
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },

  // ── Tabs ─────────────────────────────────────────────────
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94a3b8',
  },
  tabTextActive: {
    color: '#0f766e',
    fontWeight: '900',
  },

  // ── Form fields ──────────────────────────────────────────
  field: {
    marginTop: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },

  // ── Alert ────────────────────────────────────────────────
  alertBox: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  alertText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#b91c1c',
  },
  alertBoxSuccess: {
    backgroundColor: '#f0fdf4',
    borderLeftColor: '#22c55e',
  },
  alertTextSuccess: {
    color: '#15803d',
  },

  // ── Primary Button ────────────────────────────────────────
  primaryButton: {
    height: 52,
    marginTop: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f766e',
    shadowColor: '#0f766e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  primaryButtonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },

  // ── Divider ───────────────────────────────────────────────
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },

  // ── Social Buttons ────────────────────────────────────────
  socialRow: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  socialButtonPressed: {
    backgroundColor: '#f8fafc',
    opacity: 0.85,
  },
  socialButtonDisabled: {
    opacity: 0.5,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ea4335',
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
  facebookButton: {
    backgroundColor: '#1877f2',
    borderColor: '#1877f2',
  },
  facebookIcon: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
  },
  facebookButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },

  // ── Footer ────────────────────────────────────────────────
  footerNote: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
  },
});
