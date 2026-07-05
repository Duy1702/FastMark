import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  formatDiagnosticsReport,
  runFirebaseNetworkDiagnostics,
} from '../../utils/networkDiagnostics';

export default function NetworkDiagnosticsPanel() {
  const [running, setRunning] = useState(false);
  const [reportText, setReportText] = useState('');

  async function handleRunDiagnostics() {
    setRunning(true);
    setReportText('Đang kiểm tra mạng...');

    try {
      const report = await runFirebaseNetworkDiagnostics();
      setReportText(formatDiagnosticsReport(report));
    } catch (error) {
      setReportText(`Kiểm tra thất bại: ${error?.message || error}`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        disabled={running}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
          running && styles.buttonDisabled,
        ]}
        onPress={handleRunDiagnostics}
      >
        {running ? (
          <ActivityIndicator size="small" color="#0f766e" />
        ) : (
          <Text style={styles.buttonText}>Kiểm tra mạng Firebase</Text>
        )}
      </Pressable>

      {reportText ? (
        <Text style={styles.report} selectable>
          {reportText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    gap: 8,
  },
  button: {
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#99f6e4',
    backgroundColor: '#f0fdfa',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#0f766e',
    fontSize: 13,
    fontWeight: '800',
  },
  report: {
    fontSize: 11,
    lineHeight: 16,
    color: '#475569',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
});
