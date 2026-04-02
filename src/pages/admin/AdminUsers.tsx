import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Users as UsersIcon } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { getInstagramProfileUrl } from '@/lib/utils';

interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  instagram_connected: boolean;
  instagram_username: string | null;
  followers_count: number;
  created_at: string;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<UserProfile[]>('/api/admin/users').then(data => {
      if (data) setUsers(data as UserProfile[]);
      setLoading(false);
    });
  }, []);

  return (
    <AdminLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="admin-header">User Management</h1>
            <p className="text-muted-foreground mt-2">Monitor and manage community members</p>
          </div>
          <motion.div whileHover={{ scale: 1.05 }}>
            <Badge variant="secondary" className="text-base px-4 py-2 bg-gradient-to-r from-accent/30 to-accent/20 border-accent/40">
              {users.length} users
            </Badge>
          </motion.div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="space-y-4 text-center">
              <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              <p className="text-muted-foreground text-sm">Loading users...</p>
            </div>
          </div>
        ) : users.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="stat-card py-12 text-center"
          >
            <UsersIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No users found</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="glass-card overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-gradient-to-r from-secondary/50 to-transparent">
                    <th className="px-6 py-4 text-left font-display font-semibold text-foreground">Name</th>
                    <th className="px-6 py-4 text-left font-display font-semibold text-foreground">Email</th>
                    <th className="px-6 py-4 text-left font-display font-semibold text-foreground">Instagram</th>
                    <th className="px-6 py-4 text-right font-display font-semibold text-foreground">Followers</th>
                    <th className="px-6 py-4 text-right font-display font-semibold text-foreground">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => {
                    const instagramUrl = getInstagramProfileUrl(user.instagram_username);

                    return (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className="table-row-hover border-b border-border/50 last:border-b-0"
                      >
                        <td className="px-6 py-4 font-semibold text-foreground">{user.name || '-'}</td>
                        <td className="px-6 py-4 text-muted-foreground text-sm">{user.email}</td>
                        <td className="px-6 py-4">
                          {user.instagram_connected ? (
                            instagramUrl ? (
                              <motion.a
                                href={instagramUrl}
                                target="_blank"
                                rel="noreferrer"
                                whileHover={{ scale: 1.05 }}
                                className="flex items-center gap-2 text-sm font-medium text-success hover:text-success/80 transition-colors"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                @{user.instagram_username}
                              </motion.a>
                            ) : (
                              <span className="flex items-center gap-2 text-sm font-medium text-success">
                                <CheckCircle2 className="h-4 w-4" />
                                @{user.instagram_username}
                              </span>
                            )
                          ) : (
                            <span className="text-xs text-muted-foreground/60">Not connected</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <motion.span className="inline-block font-semibold text-primary" whileHover={{ scale: 1.1 }}>
                            {user.followers_count.toLocaleString()}
                          </motion.span>
                        </td>
                        <td className="px-6 py-4 text-right text-xs text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AdminLayout>
  );
};

export default AdminUsers;
