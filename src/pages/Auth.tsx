import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';

type SignUpStep = 'email' | 'otp' | 'details';
type ForgotStep = 'email' | 'otp' | 'password';
type AuthMode = 'login' | 'signup' | 'forgot';

const looksLikeEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value);

const Auth = () => {
  const navigate = useNavigate();
  const {
    user,
    isAdmin,
    isSuperadmin,
    loading,
    signIn,
    sendSignUpOtp,
    verifySignUpOtp,
    completeSignUp,
    sendPasswordResetOtp,
    verifyPasswordResetOtp,
    completePasswordReset,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [signUpStep, setSignUpStep] = useState<SignUpStep>('email');
  const [forgotStep, setForgotStep] = useState<ForgotStep>('email');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (user && isSuperadmin) return <Navigate to="/superadmin" replace />;
  if (user && isAdmin) return <Navigate to="/admin" replace />;
  if (user) return <Navigate to="/dashboard" replace />;

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setOtp('');
    setSignUpStep('email');
    setForgotStep('email');
  };

  const switchMode = (nextMode: AuthMode) => {
    if (nextMode === mode) return;
    resetForm();
    setMode(nextMode);
  };

  const beginForgotPassword = () => {
    setPassword('');
    setConfirmPassword('');
    setOtp('');
    setForgotStep('email');
    setMode('forgot');
  };

  const goBackOneStep = () => {
    if (mode === 'signup') {
      if (signUpStep === 'details') {
        setPassword('');
        setConfirmPassword('');
        setSignUpStep('otp');
        return;
      }

      setOtp('');
      setSignUpStep('email');
      return;
    }

    if (mode === 'forgot') {
      if (forgotStep === 'password') {
        setPassword('');
        setConfirmPassword('');
        setForgotStep('otp');
        return;
      }

      if (forgotStep === 'otp') {
        setOtp('');
        setForgotStep('email');
        return;
      }

      resetForm();
      setMode('login');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (mode === 'login') {
      const { error } = await signIn(email.trim(), password);
      if (error) toast.error(error.message);
      setSubmitting(false);
      return;
    }

    if (mode === 'signup') {
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

      const { error } = await completeSignUp(email.trim(), name.trim(), password);

      if (error) {
        toast.error(error.message);
        setSubmitting(false);
        return;
      }

      toast.success('Account created successfully.');
      setSubmitting(false);
      return;
    }

    if (mode === 'forgot') {
      if (forgotStep === 'email') {
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail) {
          toast.error('Enter your registered email.');
          setSubmitting(false);
          return;
        }

        if (!looksLikeEmail(normalizedEmail)) {
          toast.error('Enter a valid email address.');
          setSubmitting(false);
          return;
        }

        const { error, data } = await sendPasswordResetOtp(normalizedEmail);

        if (error) {
          toast.error(error.message);
        } else {
          setForgotStep('otp');
          if (data?.devOtp) {
            toast.success(`Development OTP: ${data.devOtp}`);
          } else {
            toast.success('If an account exists, OTP sent to your email.');
          }
        }

        setSubmitting(false);
        return;
      }

      if (forgotStep === 'otp') {
        if (otp.trim().length < 6) {
          toast.error('Enter valid OTP.');
          setSubmitting(false);
          return;
        }

        const { error } = await verifyPasswordResetOtp(email.trim(), otp.trim());

        if (error) {
          toast.error(error.message);
        } else {
          setForgotStep('password');
          toast.success('OTP verified. Set your new password now.');
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

      const { error } = await completePasswordReset(email.trim(), password);

      if (error) {
        toast.error(error.message);
        setSubmitting(false);
        return;
      }

      toast.success('Password reset successfully.');
      setSubmitting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: 'easeOut',
      },
    },
  };

  const floatingVariants = {
    animate: {
      y: [0, -10, 0],
      transition: {
        duration: 3,
        ease: 'easeInOut',
        repeat: Infinity,
      },
    },
  };

  const isLogin = mode === 'login';
  const isSignup = mode === 'signup';
  const isForgot = mode === 'forgot';

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <motion.div
        className="pointer-events-none absolute right-0 top-0 flex h-screen w-1/2 items-center justify-center overflow-hidden"
        variants={floatingVariants}
        animate="animate"
      >
        <img
          src="/3.png"
          alt="Go Clips"
          className="h-[200vh] w-auto object-contain opacity-90"
          loading="eager"
          onError={event => {
            console.log('Image failed to load');
            (event.target as HTMLImageElement).style.display = 'block';
          }}
        />
      </motion.div>

      <div className="pointer-events-none absolute bottom-0 left-0 h-1/3 w-1/2 bg-gradient-to-t from-background via-background/50 to-transparent" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-4/5 w-1/2 bg-gradient-to-t from-background via-background/50 to-transparent" />

      <div className="absolute top-1/2 z-0 -translate-y-1/2" style={{ left: '-8rem' }}>
        <div
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: 'center',
            whiteSpace: 'nowrap',
          }}
          className="gradient-text text-[150px] font-display font-bold opacity-50"
        >
          GoClips
        </div>
      </div>

      <div className="relative z-20 flex min-h-screen items-center justify-center px-4">
        <motion.button
          onClick={() => navigate('/')}
          whileHover={{ scale: 1.1, x: -5 }}
          whileTap={{ scale: 0.95 }}
          className="absolute left-6 top-6 rounded-full bg-primary/20 p-2 text-primary transition-colors hover:bg-primary/30"
          title="Back to Landing"
        >
          <ArrowLeft className="h-6 w-6" />
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
          variants={containerVariants}
        >
          <motion.div className="glass-card p-8" variants={itemVariants} whileHover={{ scale: 1.02 }} transition={{ duration: 0.3 }}>
            <motion.div className="mb-4 text-center" variants={itemVariants}>
              <h2 className="font-display text-2xl font-bold gradient-text">
                {isForgot ? 'Reset Password' : 'Go Clips Portal'}
              </h2>
              {isForgot && <p className="mt-2 text-sm text-muted-foreground">We will send an OTP to your registered email.</p>}
            </motion.div>

            {!isForgot && (
              <motion.div className="mb-6 flex rounded-lg bg-muted p-1" variants={itemVariants}>
                <motion.button
                  type="button"
                  onClick={() => switchMode('login')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                    isLogin ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  Log In
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => switchMode('signup')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                    isSignup ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  Sign Up
                </motion.button>
              </motion.div>
            )}

            {isForgot && (
              <motion.div className="mb-4">
                <Button type="button" variant="ghost" className="px-0 text-muted-foreground hover:text-foreground" onClick={() => switchMode('login')}>
                  Back to Log In
                </Button>
              </motion.div>
            )}

            <motion.form onSubmit={handleSubmit} className="space-y-4" variants={containerVariants}>
              {isLogin && (
                <>
                  <motion.div variants={itemVariants}>
                    <Label htmlFor="email">Email</Label>
                    <motion.div whileFocus={{ scale: 1.02 }} whileHover={{ scale: 1.01 }}>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="mt-1"
                      />
                    </motion.div>
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <Label htmlFor="password">Password</Label>
                    <motion.div whileFocus={{ scale: 1.02 }} whileHover={{ scale: 1.01 }}>
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
                    </motion.div>
                  </motion.div>
                  <motion.div variants={itemVariants} className="flex justify-end">
                    <button
                      type="button"
                      onClick={beginForgotPassword}
                      className="text-sm text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
                    >
                      Forgot password?
                    </button>
                  </motion.div>
                </>
              )}

              {isSignup && signUpStep === 'email' && (
                <>
                  <motion.div variants={itemVariants}>
                    <Label htmlFor="signup-name">Full Name</Label>
                    <motion.div whileFocus={{ scale: 1.02 }} whileHover={{ scale: 1.01 }}>
                      <Input
                        id="signup-name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="John Doe"
                        required
                        className="mt-1"
                      />
                    </motion.div>
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <Label htmlFor="signup-email">Email</Label>
                    <motion.div whileFocus={{ scale: 1.02 }} whileHover={{ scale: 1.01 }}>
                      <Input
                        id="signup-email"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="mt-1"
                      />
                    </motion.div>
                    <p className="mt-2 text-xs text-muted-foreground">We will send a one-time OTP before password setup.</p>
                  </motion.div>
                </>
              )}

              {isSignup && signUpStep === 'otp' && (
                <>
                  <motion.div variants={itemVariants}>
                    <Label htmlFor="verified-email">Email</Label>
                    <Input id="verified-email" type="email" value={email} disabled className="mt-1" />
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <Label htmlFor="verified-name">Full Name</Label>
                    <Input id="verified-name" value={name} disabled className="mt-1" />
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <Label htmlFor="otp">OTP</Label>
                    <motion.div whileFocus={{ scale: 1.02 }} whileHover={{ scale: 1.01 }}>
                      <Input
                        id="otp"
                        value={otp}
                        onChange={e => setOtp(e.target.value)}
                        placeholder="Enter the OTP from your email"
                        required
                        className="mt-1"
                      />
                    </motion.div>
                  </motion.div>
                </>
              )}

              {isSignup && signUpStep === 'details' && (
                <>
                  <motion.div variants={itemVariants}>
                    <Label htmlFor="signup-verified-email">Verified Email</Label>
                    <Input id="signup-verified-email" type="email" value={email} disabled className="mt-1" />
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <Label htmlFor="signup-password">Password</Label>
                    <motion.div whileFocus={{ scale: 1.02 }} whileHover={{ scale: 1.01 }}>
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
                    </motion.div>
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <Label htmlFor="confirm-password">Rewrite Password</Label>
                    <motion.div whileFocus={{ scale: 1.02 }} whileHover={{ scale: 1.01 }}>
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
                    </motion.div>
                  </motion.div>
                </>
              )}

              {isForgot && forgotStep === 'email' && (
                <motion.div variants={itemVariants}>
                  <Label htmlFor="reset-email">Email</Label>
                  <motion.div whileFocus={{ scale: 1.02 }} whileHover={{ scale: 1.01 }}>
                    <Input
                      id="reset-email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="mt-1"
                    />
                  </motion.div>
                </motion.div>
              )}

              {isForgot && forgotStep === 'otp' && (
                <>
                  <motion.div variants={itemVariants}>
                    <Label htmlFor="reset-email-confirmed">Email</Label>
                    <Input id="reset-email-confirmed" type="email" value={email} disabled className="mt-1" />
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <Label htmlFor="reset-otp">OTP</Label>
                    <motion.div whileFocus={{ scale: 1.02 }} whileHover={{ scale: 1.01 }}>
                      <Input
                        id="reset-otp"
                        value={otp}
                        onChange={e => setOtp(e.target.value)}
                        placeholder="Enter the OTP from your email"
                        required
                        className="mt-1"
                      />
                    </motion.div>
                  </motion.div>
                </>
              )}

              {isForgot && forgotStep === 'password' && (
                <>
                  <motion.div variants={itemVariants}>
                    <Label htmlFor="reset-email-verified">Verified Email</Label>
                    <Input id="reset-email-verified" type="email" value={email} disabled className="mt-1" />
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <Label htmlFor="reset-password">New Password</Label>
                    <motion.div whileFocus={{ scale: 1.02 }} whileHover={{ scale: 1.01 }}>
                      <Input
                        id="reset-password"
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="New password"
                        required
                        minLength={6}
                        className="mt-1"
                      />
                    </motion.div>
                  </motion.div>
                  <motion.div variants={itemVariants}>
                    <Label htmlFor="reset-confirm-password">Confirm Password</Label>
                    <motion.div whileFocus={{ scale: 1.02 }} whileHover={{ scale: 1.01 }}>
                      <Input
                        id="reset-confirm-password"
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        required
                        minLength={6}
                        className="mt-1"
                      />
                    </motion.div>
                  </motion.div>
                </>
              )}

              <motion.div variants={itemVariants}>
                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? 'Loading...'
                    : isLogin
                      ? 'Log In'
                      : isSignup
                        ? signUpStep === 'email'
                          ? 'Get OTP'
                          : signUpStep === 'otp'
                            ? 'Verify OTP'
                            : 'Create Account'
                        : forgotStep === 'email'
                          ? 'Send OTP'
                          : forgotStep === 'otp'
                            ? 'Verify OTP'
                            : 'Reset Password'}
                </motion.button>
              </motion.div>

              {isSignup && signUpStep !== 'email' && (
                <motion.div variants={itemVariants}>
                  <motion.button
                    type="button"
                    onClick={goBackOneStep}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full rounded-lg border-2 border-muted-foreground px-4 py-2 font-semibold text-muted-foreground transition-all hover:bg-muted/50"
                  >
                    Back
                  </motion.button>
                </motion.div>
              )}

              {isForgot && (
                <motion.div variants={itemVariants}>
                  <motion.button
                    type="button"
                    onClick={goBackOneStep}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full rounded-lg border-2 border-muted-foreground px-4 py-2 font-semibold text-muted-foreground transition-all hover:bg-muted/50"
                  >
                    Back
                  </motion.button>
                </motion.div>
              )}
            </motion.form>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Auth;
