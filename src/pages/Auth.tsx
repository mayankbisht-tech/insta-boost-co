import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';

type SignUpStep = 'email' | 'otp' | 'details';
type AuthRole = 'user' | 'admin';

type AuthProps = {
  initialRole?: AuthRole;
};

type AuthLocationState = {
  rolePreSelected?: boolean;
};

const Auth = ({ initialRole = 'user' }: AuthProps) => {
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
    signInAdmin,
    sendAdminSignUpOtp,
    verifyAdminSignUpOtp,
    completeAdminSignUp,
  } = useAuth();

  const location = useLocation();
  const rolePreSelected = (location.state as AuthLocationState | null)?.rolePreSelected === true;

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

  // Animation variants
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Logo on the right side - full screen height */}
      <motion.div
        className="absolute right-0 top-0 h-screen w-1/2 flex items-center justify-center pointer-events-none overflow-hidden"
        variants={floatingVariants}
        animate="animate"
      >
        <img
          src="/4.png"
          alt="Go Clips"
          className="h-[200vh] w-auto object-contain opacity-90"
          loading="eager"
          onError={(e) => {
            console.log('Image failed to load');
            (e.target as HTMLImageElement).style.display = 'block';
          }}
        />
      </motion.div>

      {/* Bottom blur effect */}
      <div className="absolute bottom-0 left-0 h-1/3 w-1/2 bg-gradient-to-t from-background via-background/50 to-transparent pointer-events-none z-10" />
      <div className="absolute bottom-0 right-0 h-4/5 w-1/2 bg-gradient-to-t from-background via-background/50 to-transparent pointer-events-none z-10" />

      {/* GoClips text on the left side - rotated -90 degrees */}
      <div className="absolute top-1/2 -translate-y-1/2 z-0" style={{ left: '-8rem' }}>
        <div
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: 'center',
            whiteSpace: 'nowrap',
          }}
          className="text-[150px] font-display font-bold gradient-text opacity-50"
        >
          GoClips
        </div>
      </div>

      {/* Main content - centered */}
      <div className="relative z-20 flex min-h-screen items-center justify-center px-4">
        {/* Back button */}
        <motion.button
          onClick={() => navigate('/')}
          whileHover={{ scale: 1.1, x: -5 }}
          whileTap={{ scale: 0.95 }}
          className="absolute top-6 left-6 p-2 rounded-full bg-primary/20 hover:bg-primary/30 text-primary transition-colors"
          title="Back to Landing"
        >
          <ArrowLeft className="w-6 h-6" />
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
          variants={containerVariants}
        >
        

        <motion.div className="glass-card p-8"
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div className="mb-4 text-center" variants={itemVariants}>
            <h2 className="font-display text-2xl font-bold gradient-text">{roleLabel} Portal</h2>
          </motion.div>

          <motion.div className="mb-6 flex rounded-lg bg-muted p-1" variants={itemVariants}>
            <motion.button
              type="button"
              onClick={() => switchMode(true)}
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
              onClick={() => switchMode(false)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                !isLogin ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              Sign Up
            </motion.button>
          </motion.div>

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
              </>
            )}

            {!isLogin && signUpStep === 'email' && (
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
                  <p className="mt-2 text-xs text-muted-foreground">
                    We will send a one-time OTP before password setup.
                  </p>
                </motion.div>
              </>
            )}

            {!isLogin && signUpStep === 'otp' && (
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

            {!isLogin && signUpStep === 'details' && (
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

            <motion.div variants={itemVariants}>
              <motion.button
                type="submit"
                disabled={submitting}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {submitting
                  ? 'Loading...'
                  : isLogin
                    ? `Log In as ${roleLabel}`
                    : signUpStep === 'email'
                      ? 'Get OTP'
                      : signUpStep === 'otp'
                        ? 'Verify OTP'
                        : `Create ${roleLabel} Account`}
              </motion.button>
            </motion.div>

            {!isLogin && signUpStep !== 'email' && (
              <motion.div variants={itemVariants}>
                <motion.button
                  type="button"
                  onClick={goBackOneStep}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full px-4 py-2 border-2 border-muted-foreground text-muted-foreground rounded-lg font-semibold hover:bg-muted/50 transition-all"
                >
                  Back
                </motion.button>
              </motion.div>
            )}
          </motion.form>
        </motion.div>
      </motion.div>      </div>    </div>
  );
};

export default Auth;
