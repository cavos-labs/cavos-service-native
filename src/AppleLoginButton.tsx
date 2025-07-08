import React from 'react';
import { TouchableOpacity, Text, View, ActivityIndicator, StyleSheet, Linking } from 'react-native';

export type AppleLoginButtonProps = {
  orgToken: string;
  network: string;
  finalRedirectUri: string;
  children?: React.ReactNode;
};

const AppleIcon = () => (
  <View style={styles.iconContainer}>
    <Text style={{ fontSize: 20 }}></Text>
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
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/v1/external/auth/apple?network=${encodeURIComponent(network)}&final_redirect_uri=${encodeURIComponent(finalRedirectUri)}`, {
        headers: { Authorization: `Bearer ${orgToken}` },
      });
      if (!res.ok) throw new Error('Failed to get Apple login URL');
      const data = await res.json();
      const url = data.url;
      Linking.openURL(url);
    } catch (err) {
      // Optionally handle error
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