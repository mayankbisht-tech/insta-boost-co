import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type SignUpStep = 'email' | 'otp' | 'details';
type AuthRole = 'user' | 'admin';

type AuthProps = {
  initialRole?: AuthRole;
};

const Auth = ({ initialRole = 'user' }: AuthProps) => {
  const {
    user,
    isAdmin,
    isSuperadmin,
    loading,
    signIn,
    sendSignUpOtp,
    verifySignUpOtp,
    completeSignUp,
    signInAdmin,
    sendAdminSignUpOtp,
    verifyAdminSignUpOtp,
    completeAdminSignUp,
  } = useAuth();

  const [role, setRole] = useState<AuthRole>(initialRole);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [signUpStep, setSignUpStep] = useState<SignUpStep>('email');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (user && isSuperadmin) return <Navigate to="/superadmin" replace />;
  if (user && isAdmin) return <Navigate to="/admin" replace />;
  if (user) return <Navigate to="/dashboard" replace />;

  const roleLabel = role === 'admin' ? 'Admin' : 'User';
  const roleDescription =
    role === 'admin'
      ? 'Manage campaigns, submissions, creators, and admin workflows from the admin portal.'
      : 'Earn money from your Instagram Reels and track your progress.';

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setOtp('');
    setSignUpStep('email');
  };

  const switchMode = (nextIsLogin: boolean) => {
    if (nextIsLogin === isLogin) return;
    setIsLogin(nextIsLogin);
    resetForm();
  };

  const switchRole = (nextRole: AuthRole) => {
    if (nextRole === role) return;
    setRole(nextRole);
    setIsLogin(true);
    resetForm();
  };

  const goBackOneStep = () => {
    if (signUpStep === 'details') {
      setPassword('');
      setConfirmPassword('');
      setSignUpStep('otp');
      return;
    }

    setOtp('');
    setSignUpStep('email');
  };

  const sendOtp = async () => {
    return role === 'admin'
      ? sendAdminSignUpOtp(email.trim(), name.trim())
      : sendSignUpOtp(email.trim(), name.trim());
  };

  const verifyOtp = async () => {
    return role === 'admin'
      ? verifyAdminSignUpOtp(email.trim(), otp.trim())
      : verifySignUpOtp(email.trim(), otp.trim());
  };

  const completeSignup = async () => {
    return role === 'admin'
      ? completeAdminSignUp(email.trim(), name.trim(), password)
      : completeSignUp(email.trim(), name.trim(), password);
  };

  const signInForRole = async () => {
    return role === 'admin'
      ? signInAdmin(email.trim(), password)
      : signIn(email.trim(), password);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (isLogin) {
      const { error } = await signInForRole();
      if (error) toast.error(error.message);
      setSubmitting(false);
      return;
    }

    if (signUpStep === 'email') {
      if (!name.trim()) {
        toast.error('Full name is required.');
        setSubmitting(false);
        return;
      }

      const { error, data } = await sendOtp();

      if (error) {
        toast.error(error.message);
      } else {
        setSignUpStep('otp');
        if (data?.devOtp) {
          toast.success(`Development OTP: ${data.devOtp}`);
        } else {
          toast.success('OTP sent to your email.');
        }
      }

      setSubmitting(false);
      return;
    }

    if (signUpStep === 'otp') {
      if (otp.trim().length < 6) {
        toast.error('Enter valid OTP.');
        setSubmitting(false);
        return;
      }

      const { error } = await verifyOtp();

      if (error) {
        toast.error(error.message);
      } else {
        setSignUpStep('details');
        toast.success('OTP verified. Set your password now.');
      }

      setSubmitting(false);
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      setSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      setSubmitting(false);
      return;
    }

    const { error } = await completeSignup();

    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }

    toast.success(`${roleLabel} account created successfully.`);
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="mb-4 text-center">
          <h1 className="mb-2 font-display text-4xl font-bold gradient-text">Viralkaro</h1>
          <p className="text-sm text-muted-foreground">{roleDescription}</p>
        </div>

        <div className="glass-card p-8">
          <div className="mb-6">
            <Label className="mb-2 block text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Choose Role
            </Label>
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => switchRole('user')}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  role === 'user' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                User
              </button>
              <button
                type="button"
                onClick={() => switchRole('admin')}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  role === 'admin' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                Admin
              </button>
            </div>
          </div>

          <div className="mb-4 text-center">
            <h2 className="font-display text-2xl font-bold gradient-text">{roleLabel} Portal</h2>
          </div>

          <div className="mb-6 flex rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => switchMode(true)}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                isLogin ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => switchMode(false)}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                !isLogin ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isLogin && (
              <>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    minLength={6}
                    className="mt-1"
                  />
                </div>
              </>
            )}

            {!isLogin && signUpStep === 'email' && (
              <>
                <div>
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="John Doe"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="mt-1"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    We will send a one-time OTP before password setup.
                  </p>
                </div>
              </>
            )}

            {!isLogin && signUpStep === 'otp' && (
              <>
                <div>
                  <Label htmlFor="verified-email">Email</Label>
                  <Input id="verified-email" type="email" value={email} disabled className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="verified-name">Full Name</Label>
                  <Input id="verified-name" value={name} disabled className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="otp">OTP</Label>
                  <Input
                    id="otp"
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    placeholder="Enter the OTP from your email"
                    required
                    className="mt-1"
                  />
                </div>
              </>
            )}

            {!isLogin && signUpStep === 'details' && (
              <>
                <div>
                  <Label htmlFor="signup-verified-email">Verified Email</Label>
                  <Input id="signup-verified-email" type="email" value={email} disabled className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Create password"
                    required
                    minLength={6}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="confirm-password">Rewrite Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Rewrite password"
                    required
                    minLength={6}
                    className="mt-1"
                  />
                </div>
              </>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting
                ? 'Loading...'
                : isLogin
                  ? `Log In as ${roleLabel}`
                  : signUpStep === 'email'
                    ? 'Get OTP'
                    : signUpStep === 'otp'
                      ? 'Verify OTP'
                      : `Create ${roleLabel} Account`}
            </Button>

            {!isLogin && signUpStep !== 'email' && (
              <Button type="button" variant="outline" className="w-full" onClick={goBackOneStep}>
                Back
              </Button>
            )}
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
