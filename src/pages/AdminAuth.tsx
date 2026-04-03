import { useLocation } from 'react-router-dom';
import Auth from './Auth';

const AdminAuth = () => {
  useLocation();

  return <Auth initialRole="admin" />;
};

export default AdminAuth;
