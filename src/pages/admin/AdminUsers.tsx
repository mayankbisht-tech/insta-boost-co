import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
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
      <div className="mb-6 flex items-center justify-between">
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
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Instagram</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Followers</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => {
                const instagramUrl = getInstagramProfileUrl(user.instagram_username);

                return (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-b border-border last:border-b-0 transition-colors hover:bg-muted/30"
                  >
                    <td className="px-4 py-3 font-medium">{user.name || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3">
                      {user.instagram_connected ? (
                        instagramUrl ? (
                          <a
                            href={instagramUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-xs text-success hover:underline"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            @{user.instagram_username}
                          </a>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-success">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            @{user.instagram_username}
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-muted-foreground">Not connected</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">{user.followers_count.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminUsers;
