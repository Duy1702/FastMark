import { View, StyleSheet, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import SellerPostForm from '../home/SellerPostForm';

export default function SellerPostTabScreen({ onBack, onProductCreated, onProductChanged }) {
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
          >
            <Ionicons name="chevron-back" size={22} color="#0f172a" />
          </Pressable>
        ) : (
          <View style={styles.backSpacer} />
        )}
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Đăng tin</Text>
          <Text style={styles.subtitle}>Tạo sản phẩm mới cho gian hàng của bạn</Text>
        </View>
        <View style={styles.backSpacer} />
      </View>
      <SellerPostForm
        onProductCreated={(productId) => {
          onProductChanged?.();
          onProductCreated?.(productId);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f4f7f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPressed: { opacity: 0.7 },
  backSpacer: { width: 40 },
  headerTextWrap: { flex: 1, minWidth: 0 },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1f2937',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
});
