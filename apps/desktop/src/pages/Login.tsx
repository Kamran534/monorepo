import { Login as SharedLogin } from '@monorepo/shared-ui';
import { useDesktopAuth } from '@monorepo/shared-ui';

export function Login() {
  const { login } = useDesktopAuth();

  return (
    <SharedLogin
      onLogin={login}
      emailPlaceholder="Username or Email"
    />
  );
}

export default Login;


