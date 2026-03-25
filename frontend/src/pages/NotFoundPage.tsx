import { Link } from 'react-router-dom';

export const NotFoundPage = () => (
  <div className='mx-auto flex min-h-screen w-full max-w-sm flex-col items-center justify-center bg-white px-6 text-center'>
    <p className='text-5xl font-bold text-tms-primary'>404</p>
    <p className='mt-2 text-sm text-gray-600'>Page not found</p>
    <Link to='/home' className='mt-5 rounded-lg bg-tms-primary px-4 py-2 text-sm font-semibold text-white'>Go Home</Link>
  </div>
);
