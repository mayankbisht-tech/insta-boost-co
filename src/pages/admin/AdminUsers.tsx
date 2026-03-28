import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';

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
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Users</h1>
        <Badge variant="secondary" className="text-sm">{users.length} total</Badge>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Instagram</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Followers</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <motion.tr
                  key={u.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="py-3 px-4 font-medium">{u.name || '—'}</td>
                  <td className="py-3 px-4 text-muted-foreground">{u.email}</td>
                  <td className="py-3 px-4">
                    {u.instagram_connected ? (
                      <span className="flex items-center gap-1 text-success text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        @{u.instagram_username}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">Not connected</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">{u.followers_count.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-muted-foreground text-xs">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminUsers;
