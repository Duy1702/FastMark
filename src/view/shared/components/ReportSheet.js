import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

const REPORT_REASONS = [
  'Hàng giả / hàng kém chất lượng',
  'Lừa đảo / gian lận',
  'Ngôn từ xúc phạm',
  'Thông tin sai lệch',
  'Spam / quảng cáo',
  'Khác',
];

export default function ReportSheet({ visible, title, onClose, onSubmit }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title || 'Báo cáo vi phạm'}</Text>
          <Text style={styles.subtitle}>Chọn lý do báo cáo</Text>

          {REPORT_REASONS.map((reason) => (
            <Pressable
              key={reason}
              style={({ pressed }) => [styles.reasonItem, pressed && styles.reasonItemPressed]}
              onPress={() => onSubmit?.(reason)}
            >
              <Text style={styles.reasonText}>{reason}</Text>
            </Pressable>
          ))}

          <Pressable style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Hủy</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 12,
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  reasonItem: {
    minHeight: 48,
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  reasonItemPressed: {
    opacity: 0.85,
  },
  reasonText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 8,
    minHeight: 46,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2e8f0',
  },
  cancelText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '800',
  },
});
