import { useLocation } from 'react-router-dom';
import Auth from './Auth';

const AdminAuth = () => {
  const location = useLocation();
  const rolePreSelected = (location.state as any)?.rolePreSelected === true;

  return <Auth initialRole="admin" />;
};

export default AdminAuth;
