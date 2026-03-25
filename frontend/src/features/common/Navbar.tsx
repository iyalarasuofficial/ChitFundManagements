import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Wallet, BarChart3 } from 'lucide-react';

export const Navbar = () => {
  const location = useLocation();
  const itemClass = (path: string) =>
    `flex flex-col items-center text-xs ${location.pathname.startsWith(path) ? 'text-tms-primary' : 'text-gray-600 hover:text-tms-primary'}`;

  return (
    <nav className='fixed bottom-0 left-0 right-0 z-40 mx-auto flex h-16 w-full max-w-sm items-center justify-around border-t border-gray-200 bg-white'>
      <Link to='/home' className={itemClass('/home')}><Home size={20} /><span>Home</span></Link>
      <Link to='/groups' className={itemClass('/groups')}><Users size={20} /><span>Groups</span></Link>
      <Link to='/contributions' className={itemClass('/contributions')}><Wallet size={20} /><span>Pay</span></Link>
      <Link to='/dashboard' className={itemClass('/dashboard')}><BarChart3 size={20} /><span>Dash</span></Link>
    </nav>
  );
};