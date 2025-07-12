# Cavos Service Native

React Native SDK for Cavos Wallet Provider with Apple Sign In, Auth0 integration, and secure wallet management.

## Installation

```bash
npm install cavos-service-native
```

## Features

- Apple Sign In integration
- Auth0 authentication
- Secure token storage using Expo SecureStore
- Automatic token refresh
- Wallet management and transaction execution

## Usage

### Apple Sign In

```typescript
import { SignInWithApple } from 'cavos-service-native';

// In your component
<SignInWithApple
  orgToken="your-org-secret"
  network="sepolia"
  finalRedirectUri="cavos://callback"
  onSuccess={(userData) => {
    console.log('Login successful:', userData);
    // Handle user data here
  }}
  onError={(error) => {
    console.error('Login failed:', error);
    // Handle errors here
  }}
>
  Sign in with Apple
</SignInWithApple>
```

### Google Sign In

```typescript
import { SignInWithGoogle } from 'cavos-service-native';

// In your component
<SignInWithGoogle
  orgToken="your-org-secret"
  network="sepolia"
  finalRedirectUri="cavos://callback"
  onSuccess={(userData) => {
    console.log('Login successful:', userData);
    // Handle user data here
  }}
  onError={(error) => {
    console.error('Login failed:', error);
    // Handle errors here
  }}
>
  Sign in with Google
</SignInWithGoogle>
```

### Props

- `orgToken`: Organization's secret token (Bearer token)
- `network`: Network to use (e.g., 'sepolia', 'mainnet')
- `finalRedirectUri`: URI to redirect the user after successful login (should be a registered deep link in your app, e.g., `cavos://callback`)
- `children`: (optional) Custom button content
- `onSuccess`: (optional) Function executed when login is successful. Receives user data as parameter
- `onError`: (optional) Function executed when login fails. Receives error as parameter
- `style`: (optional) Custom styles for the button
- `textStyle`: (optional) Custom styles for the button text

**Note:** User data is returned through the `onSuccess` callback function. The user data contains: `{ user_id, email, wallet, created_at, authData }`

### Complete Login Example

```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SignInWithApple, SignInWithGoogle } from 'cavos-service-native';

const LoginScreen = () => {
  const handleLoginSuccess = (userData) => {
    console.log('Login successful:', userData);
    // Navigate to main app or store user data
  };

  const handleLoginError = (error) => {
    console.error('Login failed:', error);
    // Show error message to user
  };

  return (
    <View style={styles.container}>
      <SignInWithApple
        orgToken="your-org-secret"
        network="sepolia"
        finalRedirectUri="cavos://callback"
        onSuccess={handleLoginSuccess}
        onError={handleLoginError}
        style={styles.button}
      />
      
      <SignInWithGoogle
        orgToken="your-org-secret"
        network="sepolia"
        finalRedirectUri="cavos://callback"
        onSuccess={handleLoginSuccess}
        onError={handleLoginError}
        style={styles.button}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 20,
  },
  button: {
    width: '100%',
    maxWidth: 300,
  },
});

### CavosWallet with Secure Token Storage

```typescript
import { CavosWallet } from 'cavos-service-native';

// Create wallet instance after successful authentication
const wallet = new CavosWallet(
  userData.wallet.address,
  userData.wallet.network,
  userData.email,
  userData.user_id,
  userData.org_id,
  orgSecret,
  {
    accessToken: userData.access_token,
    refreshToken: userData.refresh_token,
    expiresIn: userData.expires_in,
    timestamp: Date.now(),
    user_id: userData.user_id,
    email: userData.email,
    org_id: userData.org_id
  }
);

// Store authentication data securely
await wallet.setAuthenticationData({
  accessToken: userData.access_token,
  refreshToken: userData.refresh_token,
  expiresIn: userData.expires_in,
  timestamp: Date.now(),
  user_id: userData.user_id,
  email: userData.email,
  org_id: userData.org_id
});

// Check if user is authenticated
const isAuth = await wallet.isAuthenticated();
console.log('Is authenticated:', isAuth);

// Execute transactions (tokens are automatically refreshed if needed)
const result = await wallet.execute(
  '0x1234567890abcdef...', // contract address
  'transfer',               // entry point
  ['0xabc...', '1000000']   // calldata
);

// Get wallet information
const walletInfo = wallet.getWalletInfo();
console.log('Wallet info:', walletInfo);

// Logout and clear stored data
await wallet.logout();
```

### Loading Existing Wallet

```typescript
// Create wallet instance without auth data
const wallet = new CavosWallet(
  walletAddress,
  network,
  email,
  user_id,
  org_id,
  orgSecret
);

// Load stored authentication data
const hasStoredData = await wallet.loadStoredAuthData();
if (hasStoredData) {
  console.log('Stored authentication data loaded');
  const isAuth = await wallet.isAuthenticated();
  if (isAuth) {
    // User is authenticated, can execute transactions
    const result = await wallet.execute(contractAddress, entryPoint, calldata);
  } else {
    // Token expired and refresh failed, user needs to login again
    console.log('Authentication required');
  }
} else {
  console.log('No stored authentication data found');
}
```

## Security Features

- **Secure Storage**: Uses Expo SecureStore for encrypted token storage
- **Automatic Token Refresh**: Tokens are automatically refreshed before expiration
- **Memory Cleanup**: Sensitive data is cleared from memory when not needed
- **Error Handling**: Graceful handling of authentication failures

## API Reference

### CavosWallet

#### Constructor
```typescript
new CavosWallet(
  address: string,
  network: string,
  email: string,
  user_id: string,
  org_id: string,
  orgSecret: string,
  authData?: AuthData
)
```

#### Methods

- `setAuthenticationData(authData: AuthData): Promise<void>` - Store authentication data securely
- `loadStoredAuthData(): Promise<boolean>` - Load stored authentication data
- `isAuthenticated(): Promise<boolean>` - Check if user is authenticated
- `execute(contractAddress: string, entryPoint: string, calldata: any[]): Promise<any>` - Execute contract calls
- `logout(): Promise<void>` - Clear all stored authentication data
- `getWalletInfo(): object` - Get wallet information

### AuthData Interface

```typescript
interface AuthData {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  timestamp: number;
  user_id: string;
  email: string;
  org_id: string;
}
```

## License

MIT