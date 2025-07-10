# cavos-service-native

React Native SDK for Cavos Wallet Provider (Apple Sign In, Auth0, wallet management)

## Installation 

```bash
npm install cavos-service-native
```

**Note:** This package is compatible with Expo Managed apps. No additional native dependencies required.

## Usage

### Sign in with Apple (React Native)

```tsx
import { SignInWithApple } from 'cavos-service-native';

<SignInWithApple
  orgToken={"ORG_SECRET_TOKEN"}
  network={"sepolia"}
  finalRedirectUri={"cavos://callback"}
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

### Props

- `orgToken`: Organization's secret token (Bearer token)
- `network`: Network to use (e.g., 'sepolia', 'mainnet')
- `finalRedirectUri`: URI to redirect the user after successful login (should be a registered deep link in your app, e.g., `cavos://callback`)
- `children`: (optional) Custom button content
- `onSuccess`: (optional) Function executed when login is successful. Receives user data as parameter
- `onError`: (optional) Function executed when login fails. Receives error as parameter
- `style`: (optional) Custom styles for the button
- `textStyle`: (optional) Custom styles for the button text

**Note:** User data is returned through the `onSuccess` callback function. The user data contains: `{ user_id, email, wallet, created_at }`

## CavosWallet Implementation

### What is CavosWallet?
`CavosWallet` is a class that represents a user's wallet and provides secure methods to interact with the Cavos backend and Starknet smart contracts. It is automatically created after a successful Apple login (or other supported authentication) and is designed to be easy and safe for developers to use.

### Class Structure
```ts
export class CavosWallet {
  public address: string;   // Starknet wallet address
  public network: string;   // Network name (e.g., 'mainnet', 'sepolia')
  public email: string;     // User's email
  private hashedPk: string; // Hashed private key (never exposed)
  private orgToken: string; // Organization token for API access (never exposed)

  constructor(address, network, email, hashedPk, orgToken) { ... }

  // Execute a single contract call on Starknet
  async execute(contractAddress: string, entryPoint: string, calldata: any[]): Promise<string | { error: string }>

  // Serialize the wallet (returns only public fields)
  toJSON(): { address: string; network: string; email: string }
}
```

### How to Use CavosWallet

#### 1. Authentication Flow
When a user signs in with Apple using the `SignInWithApple` component, the `onSuccess` callback receives an instance of `CavosWallet`.

```tsx
import { SignInWithApple } from 'cavos-service-native';

<SignInWithApple
  orgToken={"ORG_SECRET_TOKEN"}
  network={"mainnet"}
  finalRedirectUri={"cavos://callback"}
  onSuccess={async (cavosWallet) => {
    // cavosWallet is ready to use!
    console.log('Wallet address:', cavosWallet.address);
    // Example: Execute a contract call
    const txHash = await cavosWallet.execute(
      "0xContractAddress",
      "entrypointName",
      [/* calldata array */]
    );
    console.log('Transaction hash:', txHash);
  }}
  onError={(error) => {
    console.error('Login failed:', error);
  }}
>
  Sign in with Apple
</SignInWithApple>
```

#### 2. Method Reference
- **`execute(contractAddress, entryPoint, calldata)`**
  - Executes a single contract call on Starknet via the Cavos backend.
  - **Parameters:**
    - `contractAddress` (string): The address of the contract to call.
    - `entryPoint` (string): The entrypoint (function) name to call.
    - `calldata` (array): The calldata array for the contract call.
  - **Returns:**
    - On success: the transaction hash (string).
    - On error: an object `{ error: string }`.

- **`toJSON()`**
  - Returns a plain object with only the public fields: `address`, `network`, and `email`.
  - Sensitive data (private key, org token) is never exposed.

### What is returned in onSuccess?
The `onSuccess` callback receives a fully authenticated `CavosWallet` instance with the following public fields:
- `address`: The user's Starknet wallet address
- `network`: The network used (e.g., 'mainnet', 'sepolia')
- `email`: The authenticated user's email

And the following main method:
- `execute(contractAddress, entryPoint, calldata)`: Executes a contract call and returns the transaction hash or an error object.

**Security Note:** Private fields such as the hashed private key and organization token are never exposed or accessible from the wallet instance.

### Example: Executing a Contract Call
```ts
const txHash = await cavosWallet.execute(
  "0x123...abc", // contract address
  "transfer",    // entrypoint
  ["0xRecipient", "1000"] // calldata
);
if (typeof txHash === 'string') {
  console.log('Transaction sent! Hash:', txHash);
} else {
  console.error('Error sending transaction:', txHash.error);
}
```

## License
MIT