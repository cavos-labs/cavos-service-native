import React from 'react';
import { TouchableOpacity, Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

export type AppleLoginButtonProps = {
  orgToken: string;
  network: string;
  finalRedirectUri: string;
  children?: React.ReactNode;
};

const AppleIcon = () => (
  <View style={styles.iconContainer}>
    <Text style={{ fontSize: 20 }}>🍎</Text>
  </View>
);

export const SignInWithApple: React.FC<AppleLoginButtonProps> = ({
  orgToken,
  network,
  finalRedirectUri,
  children
}: AppleLoginButtonProps) => {
  const [loading, setLoading] = React.useState(false);
  const baseUrl = 'https://services.cavos.xyz';

  const handleLogin = async () => {
    console.log('Apple button pressed');
    setLoading(true);
    try {
      console.log('Fetching Apple login URL...');
      const res = await fetch(`${baseUrl}/api/v1/external/auth/apple?network=${encodeURIComponent(network)}&final_redirect_uri=${encodeURIComponent(finalRedirectUri)}`, {
        headers: { Authorization: `Bearer ${orgToken}` },
      });
      console.log('Response status:', res.status);
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Failed to get Apple login URL:', errorText);
        throw new Error(`Failed to get Apple login URL: ${res.status} ${errorText}`);
      }
      const data = await res.json();
      console.log('Apple login URL received:', data.url);
      
      console.log('Starting AuthSession...');
      const result = await WebBrowser.openAuthSessionAsync(data.url, finalRedirectUri);
      
      console.log('AuthSession result:', result.type);
      
      if (result.type === 'success') {
        console.log('Auth successful, extracting user data...');
        const params = new URLSearchParams(result.url.split('?')[1]);
        const userDataStr = params.get('user_data');
        if (userDataStr) {
          const userData = JSON.parse(decodeURIComponent(userDataStr));
          console.log('User data extracted:', userData);
          // El usuario puede manejar estos datos en su app
        }
      } else if (result.type === 'cancel') {
        console.log('Auth cancelled by user');
      } else {
        console.log('Auth failed:', result);
      }
    } catch (err) {
      console.error('Apple login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handleLogin}
      disabled={loading}
      activeOpacity={0.8}
    >
      <AppleIcon />
      <Text style={styles.text} numberOfLines={1} ellipsizeMode="tail">
        {children || 'Sign in with Apple'}
      </Text>
      {loading && <ActivityIndicator size="small" color="#111" style={{ marginLeft: 8 }} />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: '#fff',
    borderRadius: 4,
    minWidth: 220,
    borderWidth: 1,
    borderColor: '#d1d5db',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  text: {
    color: '#111',
    fontFamily: 'System',
    fontSize: 15,
    fontWeight: '500',
    flexShrink: 1,
  },
  iconContainer: {
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 