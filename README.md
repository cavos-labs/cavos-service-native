# Cavos Service Native

> **⚠️ Important: Organization Registration Required**
>
> Before you can use the Cavos Service Native SDK, you must register your organization at [https://services.cavos.xyz](https://services.cavos.xyz). This process will provide you with your unique App ID and API Secret (orgToken), which are required for authentication and integration. Without registering your organization, you will not be able to use the SDK or access wallet services.
>
> - Go to [https://services.cavos.xyz](https://services.cavos.xyz) and create your organization.
> - Save your App ID and API Secret securely. **Never expose your API Secret in public frontend code or repositories.**
> - Use the App ID in SDK UI components and the API Secret (orgToken) for backend API calls or secure mobile environments.

React Native SDK for Cavos Wallet Provider with Apple/Google Sign In, secure token rotation, and wallet management.

## Installation

```bash
npm install cavos-service-native
```

## Features

- Apple & Google Sign In integration
- Auth0 authentication
- Secure token storage using Expo SecureStore
- **Rotating access/refresh tokens** (one-time use, backend-issued)
- Automatic token refresh via backend
- Wallet management and transaction execution
- Biometric authentication for sensitive operations

## Exports

- `SignInWithApple`: Apple login button component for Cavos Wallet authentication.
- `SignInWithGoogle`: Google login button component for Cavos Wallet authentication.
- `CavosWallet`: Class for managing wallets, tokens, and blockchain transactions.

## Usage

### Apple Sign In

```typescript
import { SignInWithApple } from 'cavos-service-native';

<SignInWithApple
  appId="your-org-app-id"
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
  appId="your-org-app-id"
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

### CavosWallet Class

The `CavosWallet` class manages wallet information, authentication tokens, and provides methods for blockchain interactions. **Tokens are issued and rotated securely by the backend.**

#### Constructor

```typescript
new CavosWallet(
  address: string,
  network: string,
  email: string,
  user_id: string,
  org_id: string,
  orgSecret: string,
  accessToken: string,
  refreshToken: string,
)
```

#### Main Methods

- `isAuthenticated(): Promise<boolean>` — Check if the user is authenticated (token is valid and not expired).
- `execute(contractAddress: string, entryPoint: string, calldata: any[], bioAuth?: boolean): Promise<any>` — Execute a contract call on the blockchain. Optionally require biometric authentication.
- `executeCalls(calls: any[], bioAuth?: boolean): Promise<any>` — Execute multiple contract calls in a batch. Optionally require biometric authentication.
- `swap(amount: number, sellTokenAddress: string, buyTokenAddress: string, bioAuth?: boolean): Promise<any>` — Swap tokens using the wallet. Optionally require biometric authentication.
- `getWalletInfo(): object` — Get wallet information (address, network, email, etc).
- `isTokenExpired(): boolean` — Check if the current access token is expired.
- `refreshAccessToken(): Promise<boolean>` — Refresh the access token using the backend refresh endpoint. Updates both access and refresh tokens.

#### Token Rotation Example

```typescript
// After login, tokens are stored in the CavosWallet instance
const wallet = new CavosWallet(...);

// Before making an API call, check if the token is expired and refresh if needed
if (wallet.isTokenExpired()) {
  const refreshed = await wallet.refreshAccessToken();
  if (!refreshed) {
    // Handle re-login
  }
}

// Use wallet.execute(), wallet.swap(), etc.
```

#### Security Notes

- **Tokens are never generated on the client.** All tokens are issued and rotated by the backend for maximum security.
- **Refresh tokens are one-time use and rotated on every refresh.**
- **Always use HTTPS** to protect tokens in transit.
- **Store tokens securely** using Expo SecureStore or similar.
- **Never log or expose tokens in the UI or console.**
- **Biometric authentication** is required for sensitive operations if enabled.

---

For more details, see the source code and inline JSDoc comments in each class/component.