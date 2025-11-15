import { Login as SharedLogin } from '@monorepo/shared-ui';
import { useWebAuth } from '../providers/WebAuthProvider';

export function Login() {
  const { login } = useWebAuth();

  return (
    <SharedLogin
      onLogin={login}
      showConnectionStatus={false}
    />
  );
}

export default Login;


