import { useEffect, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { useSelector } from 'react-redux';

import { selectAuthProfile } from '../../viewmodel/auth/authSelectors';
import { getPhoneGateStep } from '../../core/utils/phoneVerification';
import SellerPhoneSetupScreen from '../seller/SellerPhoneSetupScreen';
import SellerPhoneVerifyScreen from '../seller/SellerPhoneVerifyScreen';

export default function PhoneVerifyGateFlow({ visible, onCancel, onVerified }) {
  const profile = useSelector(selectAuthProfile);
  const [step, setStep] = useState('setup');

  useEffect(() => {
    if (!visible) {
      return;
    }
    const gate = getPhoneGateStep(profile);
    setStep(gate === 'verify' ? 'verify' : 'setup');
  }, [visible, profile?.phone, profile?.sellerPhoneVerified]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={styles.container}>
        {step === 'setup' ? (
          <SellerPhoneSetupScreen
            mode="transaction"
            onBack={onCancel}
            onContinue={() => setStep('verify')}
          />
        ) : (
          <SellerPhoneVerifyScreen
            mode="transaction"
            phone={profile?.phone || ''}
            onBack={() => setStep('setup')}
            onNeedPhone={() => setStep('setup')}
            onVerified={onVerified}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
});
