# cavos-service-native

React Native SDK for Cavos Wallet Provider (Apple Sign In, Auth0, wallet management)

## Instalación

```bash
npm install cavos-service-native
```

## Uso

### Sign in with Apple (React Native)

```tsx
import { SignInWithApple } from 'cavos-service-native';

<SignInWithApple
  orgToken={"ORG_SECRET_TOKEN"}
  network={"sepolia"}
  finalRedirectUri={"myapp://callback"}
>
  Sign in with Apple
</SignInWithApple>
```

- `orgToken`: Token secreto de la organización (Bearer token)
- `network`: Red a usar (por ejemplo, 'sepolia', 'mainnet')
- `finalRedirectUri`: URI a la que será redirigido el usuario tras login exitoso (debe ser manejada por tu app, por ejemplo, un deep link como `myapp://callback`)
- `children`: (opcional) Contenido personalizado del botón

**Nota:** Los datos del usuario serán devueltos a tu `finalRedirectUri` como query param `user_data` (JSON URI-encoded). Debes extraerlo en tu app:

```js
import { Linking } from 'react-native';

Linking.addEventListener('url', (event) => {
  const url = event.url;
  const params = new URLSearchParams(url.split('?')[1]);
  const userDataStr = params.get('user_data');
  if (userDataStr) {
    const userData = JSON.parse(decodeURIComponent(userDataStr));
    // userData = { user_id, email, wallet, created_at }
  }
});
```

## License
MIT