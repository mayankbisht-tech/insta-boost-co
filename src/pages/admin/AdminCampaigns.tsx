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
import { Plus, Pencil, Trash2, Megaphone } from 'lucide-react';
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
  rules: '', status: 'Active', imageFile: null as File | null,
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
      imageFile: null,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required.'); return; }
    setSaving(true);

    const formData = new FormData();
    formData.append('title', form.title.trim());
    formData.append('description', form.description.trim());
    formData.append('category', form.category);
    formData.append('reward_per_million_views', form.reward_per_million_views.toString());
    formData.append('rules', JSON.stringify(form.rules.split('\n').map(r => r.trim()).filter(Boolean)));
    formData.append('status', form.status);
    if (form.imageFile) {
      formData.append('image', form.imageFile);
    }

    try {
      if (editingId) {
        await api.put(`/api/admin/campaigns/${editingId}`, formData);
        toast.success('Campaign updated!');
      } else {
        await api.post('/api/admin/campaigns', formData);
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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="admin-header">Campaign Management</h1>
            <p className="text-muted-foreground mt-2">Create and manage your marketing campaigns</p>
          </div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button 
              onClick={openCreate}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="h-4 w-4 mr-2" /> New Campaign
            </Button>
          </motion.div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="space-y-4 text-center">
              <div className="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              <p className="text-muted-foreground text-sm">Loading campaigns...</p>
            </div>
          </div>
        ) : campaigns.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="stat-card py-12 text-center"
          >
            <Megaphone className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No campaigns yet. Create one to get started!</p>
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
                    <th className="text-left py-4 px-6 font-display font-semibold text-foreground">Campaign</th>
                    <th className="text-left py-4 px-6 font-display font-semibold text-foreground">Category</th>
                    <th className="text-left py-4 px-6 font-display font-semibold text-foreground">Reward</th>
                    <th className="text-left py-4 px-6 font-display font-semibold text-foreground">Status</th>
                    <th className="text-right py-4 px-6 font-display font-semibold text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c, i) => (
                    <motion.tr
                      key={c.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="table-row-hover border-b border-border/50 last:border-b-0"
                    >
                      <td className="py-4 px-6">
                        <motion.div 
                          className="flex items-center gap-4"
                          whileHover={{ x: 2 }}
                        >
                          {c.image_url && (
                            <motion.img 
                              src={c.image_url} 
                              alt="" 
                              className="h-12 w-16 object-cover rounded-lg border border-border shadow-md" 
                              whileHover={{ scale: 1.05 }}
                            />
                          )}
                          <motion.span className="font-semibold text-foreground hover:text-primary transition-colors">
                            {c.title}
                          </motion.span>
                        </motion.div>
                      </td>
                      <td className="py-4 px-6">
                        <Badge variant="secondary" className="bg-gradient-to-r from-accent/30 to-accent/20 border-accent/40 text-accent font-medium">
                          {c.category}
                        </Badge>
                      </td>
                      <td className="py-4 px-6 font-semibold text-primary">
                        ${c.reward_per_million_views}/1M
                      </td>
                      <td className="py-4 px-6">
                        <motion.div whileHover={{ scale: 1.05 }}>
                          <Badge 
                            variant={c.status === 'Active' ? 'default' : c.status === 'Paused' ? 'outline' : 'secondary'}
                            className={c.status === 'Active' ? 'bg-gradient-to-r from-success to-success/60 border-success/40 text-white' : ''}
                          >
                            {c.status}
                          </Badge>
                        </motion.div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <motion.div className="flex items-center justify-end gap-2" whileHover={{ scale: 1.05 }}>
                          <motion.div whileHover={{ scale: 1.1, rotate: 5 }} whileTap={{ scale: 0.95 }}>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => openEdit(c)}
                              className="hover:bg-primary/10 hover:text-primary transition-colors"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.1, rotate: -5 }} whileTap={{ scale: 0.95 }}>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDelete(c.id)} 
                              className="hover:bg-destructive/10 hover:text-destructive transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        </motion.div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </motion.div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-b from-card to-card/80">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <DialogHeader className="mb-6">
              <motion.div
                initial={{ x: -20 }}
                animate={{ x: 0 }}
              >
                <DialogTitle className="gradient-text text-2xl">
                  {editingId ? '✏️ Edit Campaign' : '🚀 Create New Campaign'}
                </DialogTitle>
              </motion.div>
            </DialogHeader>
            <div className="space-y-5 pt-2">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Label className="text-sm font-semibold">Campaign Title</Label>
                <Input 
                  value={form.title} 
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))} 
                  className="mt-2 bg-secondary/50 border-border/50 focus:border-primary transition-colors" 
                  placeholder="e.g., Summer Vibes Challenge"
                />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <Label className="text-sm font-semibold">Description</Label>
                <Textarea 
                  value={form.description} 
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} 
                  className="mt-2 bg-secondary/50 border-border/50 focus:border-primary transition-colors" 
                  rows={3} 
                  placeholder="Describe your campaign..."
                />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-2 gap-4"
              >
                <div>
                  <Label className="text-sm font-semibold">Category</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger className="mt-2 bg-secondary/50 border-border/50 focus:border-primary"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sports">Sports</SelectItem>
                      <SelectItem value="General">General</SelectItem>
                      <SelectItem value="Gambling">Gambling</SelectItem>
                      <SelectItem value="Clipping">Clipping</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Status</Label>
                  <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger className="mt-2 bg-secondary/50 border-border/50 focus:border-primary"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Closed">Closed</SelectItem>
                      <SelectItem value="Paused">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <Label className="text-sm font-semibold">Reward per 1M views ($)</Label>
                <Input 
                  type="number" 
                  value={form.reward_per_million_views} 
                  onChange={e => setForm(f => ({ ...f, reward_per_million_views: parseInt(e.target.value) || 0 }))} 
                  className="mt-2 bg-secondary/50 border-border/50 focus:border-primary transition-colors" 
                  placeholder="100"
                />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Label className="text-sm font-semibold">Rules (one per line)</Label>
                <Textarea 
                  value={form.rules} 
                  onChange={e => setForm(f => ({ ...f, rules: e.target.value }))} 
                  className="mt-2 bg-secondary/50 border-border/50 focus:border-primary transition-colors" 
                  rows={4} 
                  placeholder="Minimum 1K followers&#10;Must be an original reel" 
                />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <Label className="text-sm font-semibold">Campaign Image</Label>
                {form.imageFile && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="relative mt-2 mb-3 overflow-hidden rounded-lg"
                  >
                    <img 
                      src={URL.createObjectURL(form.imageFile)} 
                      alt="preview" 
                      className="h-32 w-full object-cover rounded-lg shadow-md" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent rounded-lg" />
                  </motion.div>
                )}
                <div className="relative">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={e => setForm(f => ({ ...f, imageFile: e.target.files?.[0] || null }))}
                    className="mt-2 bg-secondary/50 border-border/50 focus:border-primary transition-colors file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 cursor-pointer"
                  />
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex gap-3 pt-4"
              >
                <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button 
                    onClick={handleSave} 
                    disabled={saving} 
                    className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-lg hover:shadow-xl transition-all"
                  >
                    {saving ? '⏳ Saving...' : editingId ? '📝 Update Campaign' : '✨ Create Campaign'}
                  </Button>
                </motion.div>
                <Button 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                  className="hover:bg-secondary/50 transition-colors"
                >
                  Cancel
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminCampaigns;
