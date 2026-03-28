import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';

interface Campaign {
  id: string;
  title: string;
  description: string;
  category: string;
  reward_per_million_views: number;
  rules: string[];
  status: string;
  image_url: string | null;
  created_at: string;
}

const emptyForm = {
  title: '', description: '', category: 'General', reward_per_million_views: 100,
  rules: '', status: 'Active', image_url: '',
};

const AdminCampaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchCampaigns = async () => {
    const data = await api.get<Campaign[]>('/api/admin/campaigns');
    setCampaigns(data);
    setLoading(false);
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: Campaign) => {
    setEditingId(c.id);
    setForm({
      title: c.title,
      description: c.description,
      category: c.category,
      reward_per_million_views: c.reward_per_million_views,
      rules: c.rules?.join('\n') || '',
      status: c.status,
      image_url: c.image_url || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required.'); return; }
    setSaving(true);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      reward_per_million_views: form.reward_per_million_views,
      rules: form.rules.split('\n').map(r => r.trim()).filter(Boolean),
      status: form.status,
      image_url: form.image_url || null,
    };

    try {
      if (editingId) {
        await api.put(`/api/admin/campaigns/${editingId}`, payload);
        toast.success('Campaign updated!');
      } else {
        await api.post('/api/admin/campaigns', payload);
        toast.success('Campaign created!');
      }
    } catch {
      toast.error(editingId ? 'Failed to update.' : 'Failed to create.');
    }

    setSaving(false);
    setDialogOpen(false);
    fetchCampaigns();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this campaign?')) return;
    try {
      await api.delete(`/api/admin/campaigns/${id}`);
      toast.success('Campaign deleted.');
      fetchCampaigns();
    } catch {
      toast.error('Failed to delete.');
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Manage Campaigns</h1>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> New Campaign</Button>
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
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Campaign</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Category</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Reward</th>
                <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c, i) => (
                <motion.tr
                  key={c.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {c.image_url && (
                        <img src={c.image_url} alt="" className="h-10 w-14 object-cover rounded" />
                      )}
                      <span className="font-medium">{c.title}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="secondary">{c.category}</Badge>
                  </td>
                  <td className="py-3 px-4">${c.reward_per_million_views}/1M</td>
                  <td className="py-3 px-4">
                    <Badge variant={c.status === 'Active' ? 'default' : 'secondary'}>{c.status}</Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)} className="hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Campaign' : 'New Campaign'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sports">Sports</SelectItem>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Gambling">Gambling</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Reward per 1M views ($)</Label>
              <Input type="number" value={form.reward_per_million_views} onChange={e => setForm(f => ({ ...f, reward_per_million_views: parseInt(e.target.value) || 0 }))} className="mt-1" />
            </div>
            <div>
              <Label>Rules (one per line)</Label>
              <Textarea value={form.rules} onChange={e => setForm(f => ({ ...f, rules: e.target.value }))} className="mt-1" rows={4} placeholder="Minimum 1K followers&#10;Must be an original reel" />
            </div>
            <div>
              <Label>Campaign Image</Label>
              {form.image_url && (
                <img src={form.image_url} alt="" className="h-24 w-full object-cover rounded-lg mt-1 mb-2" />
              )}
              <Input
                value={form.image_url}
                onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                className="mt-1"
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </Button>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminCampaigns;
