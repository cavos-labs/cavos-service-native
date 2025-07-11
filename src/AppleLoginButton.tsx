import React from 'react';
import { TouchableOpacity, Text, View, ActivityIndicator, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Svg, { Path } from 'react-native-svg';
import { CavosWallet } from './CavosWallet';

export type AppleLoginButtonProps = {
    orgToken: string;
    network: string;
    finalRedirectUri: string;
    children?: React.ReactNode;
    style?: ViewStyle;
    textStyle?: TextStyle;
    onSuccess?: (userData: any) => void;
    onError?: (error: any) => void;
};

const AppleIcon = () => (
    <View style={styles.iconContainer}>
        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <Path
                d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"
                fill="currentColor"
            />
        </Svg>
    </View>
);

export const SignInWithApple: React.FC<AppleLoginButtonProps> = ({
    orgToken,
    network,
    finalRedirectUri,
    children,
    style,
    textStyle,
    onSuccess,
    onError
}: AppleLoginButtonProps) => {
    const [loading, setLoading] = React.useState(false);
    const baseUrl = 'https://services.cavos.xyz';

    const handleLogin = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${baseUrl}/api/v1/external/auth/apple?network=${encodeURIComponent(network)}&final_redirect_uri=${encodeURIComponent(finalRedirectUri)}`, {
                headers: { Authorization: `Bearer ${orgToken}` },
            });
            if (!res.ok) {
                const errorText = await res.text();
                console.error('Failed to get Apple login URL:', errorText);
                throw new Error(`Failed to get Apple login URL: ${res.status} ${errorText}`);
            }
            const data = await res.json();
            console.log('Starting AuthSession...');
            const result = await WebBrowser.openAuthSessionAsync(data.url, finalRedirectUri);
            if (result.type === 'success') {
                const params = new URLSearchParams(result.url.split('?')[1]);
                const userDataStr = params.get('user_data');
                if (userDataStr) {
                    const userData = JSON.parse(decodeURIComponent(userDataStr));
                    console.log(userData);
                    const authData = {
                        accessToken: userData.authData.accessToken,
                        refreshToken: userData.authData.refreshToken,
                        expiresIn: userData.authData.expiresIn,
                        timestamp: userData.authData.timestamp,
                        user_id: userData.authData.user_id,
                        email: userData.authData.email,
                        org_id: userData.authData.id
                    }
                    const cavosWallet = new CavosWallet(
                        userData.wallet.address,
                        userData.wallet.network,
                        userData.email,
                        userData.user_id,
                        userData.org_id,
                        orgToken,
                        authData
                    )
                    if (onSuccess) {
                        onSuccess(cavosWallet);
                    }
                } else {
                    console.log('No user_data found in URL');
                    if (onError) {
                        onError(new Error('No user data received'));
                    }
                }
            } else if (result.type === 'cancel') {
                console.log('Auth cancelled by user');
                if (onError) {
                    onError(new Error('Authentication cancelled'));
                }
            } else {
                console.log('Auth failed:', result);
                if (onError) {
                    onError(new Error('Authentication failed'));
                }
            }
        } catch (err) {
            console.error('Apple login error:', err);
            if (onError) {
                onError(err);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <TouchableOpacity
            style={[styles.button, style]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
        >
            <Text style={[styles.text, textStyle]} numberOfLines={1} ellipsizeMode="tail">
                {children || 'Sign in with Apple'}
            </Text>
            <AppleIcon />
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