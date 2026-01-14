import { useState, useEffect } from 'react';
import { Copy, Check, Users, Link2, Loader2, Trash2, ExternalLink, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { shareLinks, translation } from '@/lib/api';

interface ShareLink {
  id: string;
  token: string;
  expiresAt: string | null;
  revoked: boolean;
  accessCount: number;
  createdAt: string;
  targetLanguage?: string;
}

interface Language {
  code: string;
  name: string;
}

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
}

export function ShareDialog({ open, onOpenChange, documentId }: ShareDialogProps) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('view');
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [invites, setInvites] = useState<{ email: string; permission: string }[]>([]);
  const [privateLinks, setPrivateLinks] = useState<ShareLink[]>([]);
  const [creatingLink, setCreatingLink] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState<string>('7');
  const [targetLanguage, setTargetLanguage] = useState<string>('en');
  const [languages, setLanguages] = useState<Language[]>([]);

  const shareUrl = `${window.location.origin}/documents/${documentId}`;

  useEffect(() => {
    if (open) {
      loadLanguages();
      if (documentId) {
        loadPrivateLinks();
      }
    }
  }, [open, documentId]);

  const loadLanguages = async () => {
    try {
      const response = await translation.getLanguages();
      setLanguages(response.data);
    } catch (err) {
      setLanguages([
        { code: 'en', name: 'English' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'es', name: 'Spanish' },
        { code: 'it', name: 'Italian' },
      ]);
    }
  };

  const loadPrivateLinks = async () => {
    try {
      const response = await shareLinks.list(documentId);
      setPrivateLinks(response.data.filter((link: ShareLink) => !link.revoked));
    } catch (err) {
      console.error('Failed to load share links:', err);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyPrivateLink = async (token: string) => {
    const url = `${window.location.origin}/shared/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedLink(token);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleCreatePrivateLink = async () => {
    setCreatingLink(true);
    try {
      const days = expiresInDays === 'never' ? undefined : parseInt(expiresInDays);
      await shareLinks.create(documentId, days, targetLanguage);
      await loadPrivateLinks();
    } catch (err) {
      console.error('Failed to create share link:', err);
    } finally {
      setCreatingLink(false);
    }
  };

  const handleRevokeLink = async (token: string) => {
    try {
      await shareLinks.revoke(token);
      await loadPrivateLinks();
    } catch (err) {
      console.error('Failed to revoke link:', err);
    }
  };

  const handleAddInvite = () => {
    if (email && !invites.find(i => i.email === email)) {
      setInvites([...invites, { email, permission }]);
      setEmail('');
    }
  };

  const handleRemoveInvite = (emailToRemove: string) => {
    setInvites(invites.filter(i => i.email !== emailToRemove));
  };

  const handleSendInvites = async () => {
    console.log('Sending invites:', invites);
    setInvites([]);
    onOpenChange(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const getLanguageName = (code: string) => {
    return languages.find(l => l.code === code)?.name || code.toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Users className="h-5 w-5" />
            Share Document
          </DialogTitle>
          <DialogDescription>
            Share with collaborators or create translated links for international recipients.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="private-link" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="private-link">
              <Link2 className="h-4 w-4 mr-2" />
              Private Link
            </TabsTrigger>
            <TabsTrigger value="collaborators">
              <Users className="h-4 w-4 mr-2" />
              Collaborators
            </TabsTrigger>
          </TabsList>

          <TabsContent value="private-link" className="space-y-4 pt-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-4">
              <div className="space-y-2">
                <Label>Create Translated Share Link</Label>
                <p className="text-sm text-muted-foreground">
                  Recipients will see the document in their preferred language. They can switch languages anytime.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm">Receiver Language</Label>
                </div>
                <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Expires in" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleCreatePrivateLink} disabled={creatingLink} className="flex-1">
                  {creatingLink ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Link2 className="h-4 w-4 mr-2" />
                  )}
                  Generate Link
                </Button>
              </div>
            </div>

            {privateLinks.length > 0 && (
              <div className="space-y-2">
                <Label>Active Share Links</Label>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {privateLinks.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <code className="text-xs truncate max-w-[120px]">
                            ...{link.token.slice(-12)}
                          </code>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            {getLanguageName(link.targetLanguage || 'en')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {link.accessCount} view{link.accessCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Expires: {formatDate(link.expiresAt)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopyPrivateLink(link.token)}
                        >
                          {copiedLink === link.token ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(`/shared/${link.token}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRevokeLink(link.token)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="collaborators" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Share Link (Full Access)</Label>
              <div className="flex gap-2">
                <Input value={shareUrl} readOnly className="font-mono text-sm" />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Invite by Email</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                />
                <Select value={permission} onValueChange={setPermission}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View</SelectItem>
                    <SelectItem value="comment">Comment</SelectItem>
                    <SelectItem value="edit">Edit</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleAddInvite}>Add</Button>
              </div>
            </div>

            {invites.length > 0 && (
              <div className="space-y-2">
                <Label>Pending Invites</Label>
                <div className="space-y-2">
                  {invites.map((invite) => (
                    <div
                      key={invite.email}
                      className="flex items-center justify-between p-2 bg-muted rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{invite.email}</span>
                        <span className="text-xs text-muted-foreground capitalize">
                          ({invite.permission})
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveInvite(invite.email)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
                <Button onClick={handleSendInvites} className="w-full">
                  Send {invites.length} Invite{invites.length > 1 ? 's' : ''}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
