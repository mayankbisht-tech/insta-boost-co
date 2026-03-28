import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

type SignUpStep = 'email' | 'otp' | 'details';

const Auth = () => {
  const {
    user,
    loading,
    signIn,
    sendSignUpOtp,
    verifySignUpOtp,
    completeSignUp,
  } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [signUpStep, setSignUpStep] = useState<SignUpStep>('email');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const resetSignUpForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setOtp('');
    setSignUpStep('email');
  };

  const switchMode = async (nextIsLogin: boolean) => {
    if (nextIsLogin === isLogin) return;

    setIsLogin(nextIsLogin);
    resetSignUpForm();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (isLogin) {
      const { error } = await signIn(email.trim(), password);
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

      const { error, data } = await sendSignUpOtp(email.trim(), name.trim());

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

      const { error } = await verifySignUpOtp(email.trim(), otp.trim());

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

    const { error: profileError } = await completeSignUp(email.trim(), name, password);

    if (profileError) {
      toast.error(profileError.message);
      setSubmitting(false);
      return;
    }

    toast.success('Account created successfully.');
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold gradient-text mb-2">Viralkaro</h1>
          <p className="text-muted-foreground text-sm">Earn money from your Instagram Reels</p>
        </div>

        <div className="glass-card p-8">
          <div className="flex mb-6 rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => {
                void switchMode(true);
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                isLogin ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => {
                void switchMode(false);
              }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
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
                  <p className="text-xs text-muted-foreground mt-2">
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
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
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
                  ? 'Log In'
                  : signUpStep === 'email'
                    ? 'Get OTP'
                    : signUpStep === 'otp'
                      ? 'Verify OTP'
                      : 'Create Account'}
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
