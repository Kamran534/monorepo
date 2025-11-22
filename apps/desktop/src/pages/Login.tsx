import { Login as SharedLogin } from '@monorepo/shared-ui';
import { useDesktopAuth } from '@monorepo/shared-ui';
import { useNavigate } from 'react-router-dom';

export function Login() {
  const { login } = useDesktopAuth();
  const navigate = useNavigate();

  return (
    <SharedLogin
      onLogin={login}
      emailPlaceholder="Username or Email"
      onNavigate={(path) => navigate(path)}
    />
  );
}

export default Login;


