import { Text, View } from 'react-native';

import { googleLogger as log } from '../../utils/logger';
import { isExpoGoClient } from './googleAuthConfig';
import GoogleSignInNativeImpl from './googleSignInNativeImpl';
import { GoogleSignInPressable } from './googleSignInShared';

function ExpoGoGoogleSignInButton({ disabled, onError }) {
  function handlePress() {
    log.warn('signIn:blocked-expo-go');
    onError?.('Google Sign-In không chạy trên Expo Go. Chạy: npx expo run:android');
  }

  return (
    <View>
      <GoogleSignInPressable disabled={disabled} onPress={handlePress} />
      <Text style={{ marginTop: 8, fontSize: 12, color: '#b45309', textAlign: 'center' }}>
        Expo Go không hỗ trợ Google. Cần build native.
      </Text>
    </View>
  );
}

export default function GoogleSignInButton(props) {
  if (isExpoGoClient()) {
    log.info('render:expo-go-blocked');
    return <ExpoGoGoogleSignInButton {...props} />;
  }

  return <GoogleSignInNativeImpl {...props} />;
}
