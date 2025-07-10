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

## License
MIT