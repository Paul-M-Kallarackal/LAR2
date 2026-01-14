import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  LogOut,
  User,
  Link2,
  ExternalLink,
  Clock,
  Search,
} from 'lucide-react';

interface SharedDocument {
  token: string;
  title: string;
  accessedAt: string;
}

export default function BorrowerDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [shareLink, setShareLink] = useState('');
  const [recentDocuments, setRecentDocuments] = useState<SharedDocument[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('borrower-recent-docs');
    if (stored) {
      setRecentDocuments(JSON.parse(stored));
    }
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleOpenShareLink = () => {
    if (!shareLink.trim()) return;

    let token = shareLink.trim();
    if (token.includes('/shared/')) {
      token = token.split('/shared/')[1];
    }

    const newDoc: SharedDocument = {
      token,
      title: `Document ${token.slice(-8)}`,
      accessedAt: new Date().toISOString(),
    };

    const updatedDocs = [newDoc, ...recentDocuments.filter(d => d.token !== token)].slice(0, 10);
    setRecentDocuments(updatedDocs);
    localStorage.setItem('borrower-recent-docs', JSON.stringify(updatedDocs));

    navigate(`/shared/${token}`);
  };

  const handleOpenRecent = (token: string) => {
    navigate(`/shared/${token}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-slate-50">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-semibold">LAR</h1>
                <p className="text-xs text-muted-foreground">LMA Automate Reimagined</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-full">
                <User className="h-4 w-4" />
                <span className="text-sm font-medium">{user?.name}</span>
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                  Borrower
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Welcome, {user?.name}</h2>
            <p className="text-muted-foreground">
              Access loan documents shared with you by entering a share link below.
            </p>
          </div>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary" />
                Open Shared Document
              </CardTitle>
              <CardDescription>
                Paste a share link from your loan provider to view the document
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="share-link">Share Link or Token</Label>
                <div className="flex gap-2">
                  <Input
                    id="share-link"
                    placeholder="https://...shared/abc123 or abc123"
                    value={shareLink}
                    onChange={(e) => setShareLink(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleOpenShareLink()}
                    className="flex-1"
                  />
                  <Button onClick={handleOpenShareLink} disabled={!shareLink.trim()}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {recentDocuments.length > 0 && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Recently Accessed
                </CardTitle>
                <CardDescription>
                  Documents you've viewed recently
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {recentDocuments.map((doc) => (
                      <div
                        key={doc.token}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                        onClick={() => handleOpenRecent(doc.token)}
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{doc.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(doc.accessedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          <Card className="border-0 shadow-lg bg-primary/5">
            <CardContent className="pt-6">
              <div className="text-center space-y-2">
                <Search className="h-8 w-8 mx-auto text-primary opacity-50" />
                <h3 className="font-medium">Waiting for a share link?</h3>
                <p className="text-sm text-muted-foreground">
                  Your loan provider will send you a private link to access loan documents.
                  Once you have it, paste it above to view and comment on the document.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
