import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { 
  Copy, 
  Check, 
  MessageSquare, 
  Sparkles, 
  Loader2,
  Globe,
  FileText,
  StickyNote,
  Languages,
  Quote,
  X,
  Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { shareLinks, comments as commentsApi } from '@/lib/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Document {
  id: string;
  title: string;
  content: any;
  currentLanguage?: string;
}

interface Language {
  code: string;
  name: string;
}

export default function SharedDocumentPage() {
  const { token } = useParams<{ token: string }>();
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [lastSelectedText, setLastSelectedText] = useState('');
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [availableLanguages, setAvailableLanguages] = useState<Language[]>([]);
  const [changingLanguage, setChangingLanguage] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [notes, setNotes] = useState<any[]>([]);
  const [savingNote, setSavingNote] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [commentQuote, setCommentQuote] = useState('');
  const [savingComment, setSavingComment] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
    ],
    editable: false,
    content: '',
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        const text = editor.state.doc.textBetween(from, to, ' ');
        setSelectedText(text);
        if (text.trim()) {
          setLastSelectedText(text);
        }
      } else {
        setSelectedText('');
      }
    },
  });

  const fetchDocument = useCallback(async (lang?: string) => {
    if (!token) return;
    
    try {
      setLoading(true);
      const response = await shareLinks.getShared(token, lang);
      const data = response.data;
      
      setDocument(data.document);
      setCurrentLanguage(data.document.currentLanguage || data.shareLink?.targetLanguage || 'en');
      
      if (data.availableLanguages) {
        setAvailableLanguages(data.availableLanguages);
      }

      if (editor && data.document?.content) {
        editor.commands.setContent(data.document.content);
      }

      if (data.document?.id) {
        try {
          const allComments = await commentsApi.list(data.document.id);
          setNotes(allComments.data.filter((n: any) => n.type === 'note'));
          setComments(allComments.data.filter((c: any) => c.type === 'comment'));
        } catch {
          setNotes([]);
          setComments([]);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [token, editor]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  useEffect(() => {
    if (editor && document?.content) {
      editor.commands.setContent(document.content);
    }
  }, [editor, document?.content]);

  const handleLanguageChange = async (newLang: string) => {
    if (newLang === currentLanguage || !token) return;
    
    setChangingLanguage(true);
    try {
      const response = await shareLinks.getShared(token, newLang);
      const data = response.data;
      
      setDocument(data.document);
      setCurrentLanguage(data.document.currentLanguage || newLang);
      
      if (editor && data.document?.content) {
        editor.commands.setContent(data.document.content);
      }
    } catch (err) {
      console.error('Failed to change language:', err);
    } finally {
      setChangingLanguage(false);
    }
  };

  const handleCopy = useCallback(() => {
    const text = selectedText.trim() ? selectedText : lastSelectedText;
    if (text.trim()) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [selectedText, lastSelectedText]);

  const handleSummarize = async () => {
    const textToExplain = selectedText.trim() || lastSelectedText.trim();
    console.log('[Explain] selectedText:', selectedText, 'lastSelectedText:', lastSelectedText, 'using:', textToExplain);
    
    if (!textToExplain) {
      setSummary(null);
      setSummaryError('Select some text to explain.');
      return;
    }
    
    setSummarizing(true);
    setSummaryError(null);
    
    try {
      if (!token) {
        setSummaryError('Missing share token.');
        setSummary(null);
        return;
      }

      const language = getLanguageName(currentLanguage);
      console.log('[Explain] Calling API with clause length:', textToExplain.length, 'language:', language);
      const response = await shareLinks.explainShared(token, textToExplain, language);
      console.log('[Explain] Response:', response.data);
      setSummary(response.data.explanation);
    } catch (err) {
      const anyErr = err as any;
      console.error('[Explain] Error:', anyErr);
      const message =
        anyErr?.response?.data?.message ||
        anyErr?.message ||
        'Explain failed. Please try again.';
      setSummary(null);
      setSummaryError(message);
    } finally {
      setSummarizing(false);
    }
  };

  const handleSaveNote = async () => {
    if (!noteContent.trim() || !document?.id) return;

    setSavingNote(true);
    try {
      const response = await commentsApi.create(document.id, {
        content: noteContent,
        type: 'note',
      });
      setNotes([...notes, response.data]);
      setNoteContent('');
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      setSavingNote(false);
    }
  };

  const openCommentDialog = () => {
    if (!selectedText) return;
    setCommentQuote(selectedText);
    setCommentContent('');
    setCommentDialogOpen(true);
  };

  const handleSaveComment = async () => {
    if (!commentContent.trim() || !document?.id) return;

    setSavingComment(true);
    try {
      const response = await commentsApi.create(document.id, {
        content: commentContent,
        sectionId: commentQuote,
        type: 'comment',
      });
      setComments([...comments, response.data]);
      setCommentDialogOpen(false);
      setCommentContent('');
      setCommentQuote('');
    } catch (err) {
      console.error('Failed to save comment:', err);
    } finally {
      setSavingComment(false);
    }
  };

  const getLanguageName = (code: string) => {
    return availableLanguages.find(l => l.code === code)?.name || code.toUpperCase();
  };

  const renderMarkdown = (text: string) => {
    const html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^\d+\.\s+/gm, '• ')
      .replace(/\n/g, '<br/>');
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
            <h2 className="mt-4 text-lg font-semibold">Unable to Access Document</h2>
            <p className="mt-2 text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-primary" />
              <div>
                <h1 className="font-semibold">{document?.title || 'Shared Document'}</h1>
                <p className="text-sm text-muted-foreground">Read-only access</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
                <Languages className="h-4 w-4 text-muted-foreground" />
                <Select 
                  value={currentLanguage} 
                  onValueChange={handleLanguageChange}
                  disabled={changingLanguage}
                >
                  <SelectTrigger className="w-[150px] border-0 bg-transparent h-8">
                    <SelectValue>
                      {changingLanguage ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Translating...
                        </span>
                      ) : (
                        getLanguageName(currentLanguage)
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableLanguages.map(lang => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                {selectedText && (
                  <div className="mb-4 p-3 bg-muted rounded-lg flex items-center justify-between">
                    <span className="text-sm text-muted-foreground truncate flex-1">
                      Selected: "{selectedText.substring(0, 50)}..."
                    </span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={handleCopy}>
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copied ? 'Copied!' : 'Copy'}
                      </Button>
                      <Button size="sm" onClick={handleSummarize} disabled={summarizing}>
                        {summarizing ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-1" />
                        )}
                        Explain
                      </Button>
                    </div>
                  </div>
                )}

                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <EditorContent editor={editor} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {(summary || summaryError) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI Explanation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    {summary ? renderMarkdown(summary) : summaryError}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => {
                      setSummary(null);
                      setSummaryError(null);
                    }}
                  >
                    Dismiss
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  Document Language
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Currently viewing in <span className="font-medium text-foreground">{getLanguageName(currentLanguage)}</span>. 
                  Select a different language to translate.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {availableLanguages.slice(0, 6).map(lang => (
                    <Button
                      key={lang.code}
                      variant={lang.code === currentLanguage ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleLanguageChange(lang.code)}
                      disabled={changingLanguage}
                      className="justify-start"
                    >
                      {lang.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-primary" />
                  My Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <textarea
                    placeholder="Add a private note..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    rows={3}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <Button 
                    size="sm" 
                    onClick={handleSaveNote} 
                    disabled={!noteContent.trim() || savingNote}
                    className="w-full"
                  >
                    {savingNote ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Save Note
                  </Button>
                </div>

                {notes.length > 0 && (
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {notes.map((note: any) => (
                        <div key={note.id} className="p-2 bg-muted rounded text-sm">
                          {note.content}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Comments
                  {comments.length > 0 && (
                    <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {comments.length}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Select text in the document and add comments for the loan provider to review.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full" 
                    disabled={!selectedText}
                    onClick={openCommentDialog}
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Add Comment on Selection
                  </Button>
                </div>

                {comments.length > 0 && (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3">
                      {comments.map((comment: any) => (
                        <div key={comment.id} className="p-3 bg-muted/50 rounded-lg border border-border/50">
                          {comment.sectionId && (
                            <div className="flex items-start gap-2 mb-2 p-2 bg-background/50 rounded border-l-2 border-primary/50">
                              <Quote className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-muted-foreground italic line-clamp-2">
                                "{comment.sectionId}"
                              </p>
                            </div>
                          )}
                          <p className="text-sm">{comment.content}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(comment.createdAt).toLocaleDateString()} at{' '}
                            {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Add Comment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg border-l-2 border-primary">
              <div className="flex items-start gap-2">
                <Quote className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground italic">
                  "{commentQuote.length > 200 ? commentQuote.substring(0, 200) + '...' : commentQuote}"
                </p>
              </div>
            </div>
            <div>
              <textarea
                placeholder="Write your comment for the loan provider..."
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                rows={4}
                autoFocus
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setCommentDialogOpen(false)}
                disabled={savingComment}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button 
                onClick={handleSaveComment}
                disabled={!commentContent.trim() || savingComment}
              >
                {savingComment ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Send className="h-4 w-4 mr-1" />
                )}
                Submit Comment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
