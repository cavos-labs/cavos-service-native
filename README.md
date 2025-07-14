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

## Exports

- `SignInWithApple`: Apple login button component for Cavos Wallet authentication.
- `SignInWithGoogle`: Google login button component for Cavos Wallet authentication.
- `CavosWallet`: Class for managing wallets, tokens, and blockchain transactions.

## Usage

### Apple Sign In

```typescript
import { SignInWithApple } from 'cavos-service-native';

<SignInWithApple
  orgToken="your-org-secret"
  network="sepolia"
  finalRedirectUri="cavos://callback"
  onSuccess={(wallet) => {
    // wallet is a CavosWallet instance
    console.log('Login successful:', wallet);
  }}
  onError={(error) => {
    console.error('Login failed:', error);
  }}
>
  Sign in with Apple
</SignInWithApple>
```

### Google Sign In

```typescript
import { SignInWithGoogle } from 'cavos-service-native';

<SignInWithGoogle
  orgToken="your-org-secret"
  network="sepolia"
  finalRedirectUri="cavos://callback"
  onSuccess={(wallet) => {
    // wallet is a CavosWallet instance
    console.log('Login successful:', wallet);
  }}
  onError={(error) => {
    console.error('Login failed:', error);
  }}
>
  Sign in with Google
</SignInWithGoogle>
```

### Props for SignInWithApple & SignInWithGoogle

| Prop              | Type                       | Required | Description                                                                 |
|-------------------|----------------------------|----------|-----------------------------------------------------------------------------|
| orgToken          | string                     | Yes      | Organization's secret token (Bearer token)                                  |
| network           | string                     | Yes      | Network to use (e.g., 'sepolia', 'mainnet')                                 |
| finalRedirectUri  | string                     | Yes      | Deep link URI to redirect after login (e.g., cavos://callback)              |
| children          | React.ReactNode            | No       | Custom button content                                                       |
| style             | object                     | No       | Custom styles for the button                                                |
| textStyle         | object                     | No       | Custom styles for the button text                                           |
| onSuccess         | (wallet: CavosWallet) => void | No    | Callback executed when login is successful. Receives CavosWallet instance   |
| onError           | (error: any) => void       | No       | Callback executed when login fails. Receives error                          |

**Note:** The `onSuccess` callback receives a `CavosWallet` instance, which can be used to manage tokens and execute transactions.

### CavosWallet Class

The `CavosWallet` class manages wallet information, authentication tokens, and provides methods for blockchain interactions.

#### Constructor

```typescript
new CavosWallet(
  address: string,
  network: string,
  email: string,
  user_id: string,
  org_id: string,
  orgSecret: string,
  accessToken?: string | null,
  refreshToken?: string | null,
  tokenExpiry?: number | null
)
```

#### Main Methods

- `setAuthenticationData(authData: AuthData): Promise<void>` — Store authentication data securely in the wallet instance.
- `loadStoredAuthData(): Promise<boolean>` — Load stored authentication data (if implemented).
- `isAuthenticated(): Promise<boolean>` — Check if the user is authenticated (token is valid and not expired).
- `execute(contractAddress: string, entryPoint: string, calldata: any[]): Promise<any>` — Execute a contract call on the blockchain.
- `executeCalls(calls: any[]): Promise<any>` — Execute multiple contract calls in a batch.
- `swap(amount: number, sellTokenAddress: string, buyTokenAddress: string): Promise<any>` — Swap tokens using the wallet.
- `getWalletInfo(): object` — Get wallet information (address, network, email, etc).
- `logout(): Promise<void>` — Clear all stored authentication data.
- `toJSON(): object` — Serialize wallet to JSON.

#### AuthData Interface

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