import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';

type AccountStatus = 'active' | 'banned' | 'suspended' | null;

interface User {
  id: string;
  email: string;
}

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  account_status: Exclude<AccountStatus, null>;
  instagram_connection_status: 'not_connected' | 'approval_pending' | 'approved' | 'rejected';
  instagram_connected: boolean;
  instagram_username: string | null;
  instagram_user_id: string | null;
  instagram_verified: boolean;
  verification_code: string | null;
  followers_count: number;
  created_at: string;
  roles: string[];
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  isInstagramConnected: boolean;
  accountStatus: AccountStatus;

  sendSignUpOtp: (email: string, name: string) => Promise<{ error: Error | null; data: SignUpOtpResponse | null }>;
  verifySignUpOtp: (email: string, token: string) => Promise<{ error: Error | null }>;
  completeSignUp: (email: string, name: string, password: string) => Promise<{ error: Error | null }>;
  sendAdminSignUpOtp: (email: string, name: string) => Promise<{ error: Error | null; data: SignUpOtpResponse | null }>;
  verifyAdminSignUpOtp: (email: string, token: string) => Promise<{ error: Error | null }>;
  completeAdminSignUp: (email: string, name: string, password: string) => Promise<{ error: Error | null }>;

  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInAdmin: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface SignUpOtpResponse {
  error?: string;
  message?: string;
  devOtp?: string;
}

interface AuthPayload {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // ================= PROFILE =================

  const hydrateUserState = async (payload: AuthPayload | null) => {
    setUser(payload?.user ?? null);
    setProfile(payload?.profile ?? null);
    setIsAdmin(payload?.isAdmin ?? false);

    if (!payload?.user) {
      setProfile(null);
      setIsAdmin(false);
    }
  };

  const refreshProfile = async () => {
    try {
      const data = await api.get<AuthPayload>('/api/auth/me');
      await hydrateUserState(data);
    } catch {
      await hydrateUserState(null);
    }
  };

  // ================= INIT =================

  useEffect(() => {
    refreshProfile().finally(() => {
      setLoading(false);
    });
  }, []);

  // ================= OTP FLOW =================

  const invokeSignUpOtp = async (path: string, payload: Record<string, unknown>) => {
    try {
      const data = await api.post<SignUpOtpResponse>(path, payload);
      return { error: null, data: data ?? null };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Request failed.';
      return { error: new Error(message), data: null };
    }
  };

  // SEND OTP
  const sendSignUpOtp = async (email: string, name: string) => {
    return invokeSignUpOtp('/api/auth/signup/send-otp', {
      email: email.trim().toLowerCase(),
      name: name.trim(),
    });
  };

  // VERIFY OTP
  const verifySignUpOtp = async (email: string, token: string) => {
    const result = await invokeSignUpOtp('/api/auth/signup/verify-otp', {
      email: email.trim().toLowerCase(),
      otp: token.trim().toUpperCase(),
    });

    return { error: result.error };
  };

  // COMPLETE PROFILE
  const completeSignUp = async (email: string, name: string, password: string) => {
    const signUpResult = await invokeSignUpOtp('/api/auth/signup/complete', {
      email: email.trim().toLowerCase(),
      name: name.trim(),
      password,
    });

    if (signUpResult.error) {
      return signUpResult;
    }

    const signInResult = await signIn(email, password);
    if (signInResult.error) {
      return signInResult;
    }

    await refreshProfile();
    return { error: null };
  };

  const sendAdminSignUpOtp = async (email: string, name: string) => {
    return invokeSignUpOtp('/api/auth/admin/signup/send-otp', {
      email: email.trim().toLowerCase(),
      name: name.trim(),
    });
  };

  const verifyAdminSignUpOtp = async (email: string, token: string) => {
    const result = await invokeSignUpOtp('/api/auth/admin/signup/verify-otp', {
      email: email.trim().toLowerCase(),
      otp: token.trim().toUpperCase(),
    });

    return { error: result.error };
  };

  const completeAdminSignUp = async (email: string, name: string, password: string) => {
    const signUpResult = await invokeSignUpOtp('/api/auth/admin/signup/complete', {
      email: email.trim().toLowerCase(),
      name: name.trim(),
      password,
    });

    if (signUpResult.error) {
      return signUpResult;
    }

    const signInResult = await signInAdmin(email, password);
    if (signInResult.error) {
      return signInResult;
    }

    await refreshProfile();
    return { error: null };
  };

  // ================= LOGIN =================

  const signIn = async (email: string, password: string) => {
    try {
      await api.post('/api/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });
      await refreshProfile();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed.';
      return { error: new Error(message) };
    }

    return { error: null };
  };

  const signInAdmin = async (email: string, password: string) => {
    try {
      await api.post('/api/auth/admin/login', {
        email: email.trim().toLowerCase(),
        password,
      });
      await refreshProfile();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Admin login failed.';
      return { error: new Error(message) };
    }

    return { error: null };
  };

  const signOut = async () => {
    await api.post('/api/auth/logout');
    setProfile(null);
    setUser(null);
    setIsAdmin(false);
  };

  const isInstagramConnected =
    profile?.instagram_connection_status === 'approved';

  const accountStatus = profile?.account_status ?? null;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAdmin,
        isInstagramConnected,
        accountStatus,
        sendSignUpOtp,
        verifySignUpOtp,
        completeSignUp,
        sendAdminSignUpOtp,
        verifyAdminSignUpOtp,
        completeAdminSignUp,
        signIn,
        signInAdmin,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
