import React from 'react';
import { TouchableOpacity, Text, View, ActivityIndicator, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Svg, { Path } from 'react-native-svg';
import { CavosWallet } from './CavosWallet';

export type GoogleLoginButtonProps = {
    appId: string;
    network: string;
    finalRedirectUri: string;
    children?: React.ReactNode;
    style?: ViewStyle;
    textStyle?: TextStyle;
    onSuccess?: (userData: any) => void;
    onError?: (error: any) => void;
};

const GoogleIcon = () => (
    <View style={styles.iconContainer}>
        <Svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <Path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
            />
            <Path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
            />
            <Path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
            />
            <Path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
            />
        </Svg>
    </View>
);

/**
 * Google Sign In button for Cavos Wallet authentication.
 *
 * Opens a Google authentication flow and returns a CavosWallet instance on success.
 *
 * @component
 * @param {string} appId - Organization's app id
 * @param {string} network - Network to use (e.g., 'sepolia', 'mainnet')
 * @param {string} finalRedirectUri - URI to redirect the user after successful login (should be a registered deep link in your app)
 * @param {React.ReactNode} [children] - Custom button content
 * @param {object} [style] - Custom styles for the button
 * @param {object} [textStyle] - Custom styles for the button text
 * @param {(userData: CavosWallet) => void} [onSuccess] - Callback executed when login is successful
 * @param {(error: any) => void} [onError] - Callback executed when login fails
 *
 * @example
 * <SignInWithGoogle
 *   orgToken="your-org-secret"
 *   network="sepolia"
 *   finalRedirectUri="cavos://callback"
 *   onSuccess={(wallet) => console.log(wallet)}
 *   onError={(err) => console.error(err)}
 * >
 *   Sign in with Google
 * </SignInWithGoogle>
 */
export const SignInWithGoogle: React.FC<GoogleLoginButtonProps> = ({
    appId,
    network = 'sepolia',
    finalRedirectUri,
    children,
    style,
    textStyle,
    onSuccess,
    onError
}: GoogleLoginButtonProps) => {
    const [loading, setLoading] = React.useState(false);
    const baseUrl = 'https://services.cavos.xyz';

    const handleLogin = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${baseUrl}/api/v1/external/auth/google?network=${encodeURIComponent(network)}&final_redirect_uri=${encodeURIComponent(finalRedirectUri)}&app_id=${encodeURIComponent(appId)}`);
            if (!res.ok) {
                const errorText = await res.text();
                console.error('Failed to get Google login URL:', errorText);
                throw new Error(`Failed to get Google login URL: ${res.status} ${errorText}`);
            }
            
            let data;
            try {
                data = await res.json();
            } catch (parseError: any) {
                console.error('Failed to parse response as JSON:', parseError);
                const responseText = await res.text();
                console.error('Response text:', responseText);
                throw new Error(`Failed to parse response as JSON: ${parseError.message}. Response: ${responseText}`);
            }
            console.log('Starting AuthSession...');
            const result = await WebBrowser.openAuthSessionAsync(data.url, finalRedirectUri);
            if (result.type === 'success') {
                // Support both query string and fragment for user_data
                let paramsString = '';
                if (result.url.includes('?')) {
                    paramsString = result.url.split('?')[1].split('#')[0];
                }
                if (result.url.includes('#')) {
                    if (paramsString.length > 0) {
                        paramsString += '&';
                    }
                    paramsString += result.url.split('#')[1];
                }
                const params = new URLSearchParams(paramsString);
                const userDataStr = params.get('user_data');
                if (userDataStr) {
                    try {
                        const userData = JSON.parse(decodeURIComponent(userDataStr));
                        const cavosWallet = new CavosWallet(
                            userData.wallet.address,
                            userData.wallet.network,
                            userData.email,
                            userData.user_id,
                            userData.org_id,
                            appId,
                            userData.clientId,
                            userData.domain,
                            userData.authData.accessToken,
                        );
                        if (onSuccess) {
                            onSuccess(cavosWallet);
                        }
                    } catch (parseError: any) {
                        console.error('Failed to parse user data:', parseError);
                        console.error('User data string:', userDataStr);
                        if (onError) {
                            onError(new Error(`Failed to parse user data: ${parseError.message}`));
                        }
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
            console.error('Google login error:', err);
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
            <GoogleIcon />
            <Text style={[styles.text, textStyle]} numberOfLines={1} ellipsizeMode="tail">
                {children || 'Sign in with Google'}
            </Text>
            {loading && <ActivityIndicator size="small" color="#4285F4" style={{ marginLeft: 8 }} />}
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