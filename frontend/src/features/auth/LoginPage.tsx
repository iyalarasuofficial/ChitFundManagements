import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { ArrowRight, Mail, Lock } from 'lucide-react';

export const LoginPage = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(phone, password);
      navigate('/home');
    } catch (err: any) {
      setError(err.message || 'Unable to log in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-white min-h-screen flex flex-col shadow-[0_0_30px_rgba(0,0,0,0.1)]">
      {/* Background Decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-gradient-to-l from-tms-primary to-tms-secondary opacity-5"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-gradient-to-r from-tms-primary to-tms-secondary opacity-5"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-tms-secondary to-tms-primary"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md px-6 flex flex-col justify-center min-h-screen">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-tms-primary to-tms-primary-dark text-white mb-4 shadow-lg">
            <span className="text-2xl font-bold">C</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Chit Fund Manager</h1>
          <p className="text-gray-600 text-sm">Manage your groups and collections effortlessly</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 mb-6">
          {/* Card Header with gradient */}
          <div className="h-1.5 bg-gradient-to-r from-tms-secondary to-tms-primary"></div>

          <div className="p-6">
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
                <span className="text-lg">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Phone Field */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 text-gray-400" size={18} />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your phone number"
                  className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:border-tms-primary focus:ring-2 focus:ring-tms-primary/10 transition-all duration-200 bg-white"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:border-tms-primary focus:ring-2 focus:ring-tms-primary/10 transition-all duration-200 bg-white"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="text-right mb-6">
              <Link
                to="#"
                className="text-xs text-tms-primary hover:text-tms-primary-dark font-medium transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              onClick={handleSubmit}
              className="bg-tms-primary hover:bg-tms-primary-dark text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-gray-200 border-t-white animate-spin"></div>
                  Logging in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sign Up Link */}
        <div className="text-center">
          <p className="text-gray-600 text-sm mb-3">
            Don't have an account?
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 text-tms-primary hover:text-tms-primary-dark font-semibold transition-colors"
          >
            Create account
            <ArrowRight size={16} />
          </Link>
        </div>

      </div>
    </div>
  );
};
