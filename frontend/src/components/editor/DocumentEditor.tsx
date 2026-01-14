import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import FontFamily from '@tiptap/extension-font-family';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { useEffect, useCallback, useState, useRef } from 'react';
import { EditorToolbar } from './EditorToolbar';
import { useDocumentStore } from '@/stores/document.store';
import { useCollaborationStore } from '@/stores/collaboration.store';
import { compliance } from '@/lib/api';
import { CompliancePanel } from '@/components/compliance/CompliancePanel';
import { ShareDialog } from '@/components/collaboration/ShareDialog';
import { CollaboratorAvatars } from '@/components/collaboration/CollaboratorAvatars';
import { ComplianceHighlight, applyComplianceHighlights, getIssueFromCoords } from '@/extensions/compliance-highlight';
import type { ComplianceIssue } from '@/extensions/compliance-highlight';
import { AlertCircle, AlertTriangle, Info, Scale, Users } from 'lucide-react';

interface DocumentEditorProps {
  documentId: string;
}

export function DocumentEditor({ documentId }: DocumentEditorProps) {
  const { currentDocument, updateDocument, isSaving, updateLocalContent } = useDocumentStore();
  const { connectedUsers, joinDocument, leaveDocument, sendContent, onContent } = useCollaborationStore();

  const [showCompliance, setShowCompliance] = useState(false);
  const [complianceReport, setComplianceReport] = useState<any>(null);
  const [showShare, setShowShare] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hoveredIssue, setHoveredIssue] = useState<ComplianceIssue | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Start typing your document...' }),
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false }),
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
      FontFamily,
      TextStyle,
      Color,
      Subscript,
      Superscript,
      ComplianceHighlight,
    ],
    content: currentDocument?.content || '',
    onUpdate: ({ editor }) => {
      const content = editor.getJSON();
      updateLocalContent(content);
      if (documentId) {
        sendContent(documentId, content);
      }
    },
  });

  useEffect(() => {
    if (currentDocument?.content && editor) {
      const currentContent = JSON.stringify(editor.getJSON());
      const newContent = JSON.stringify(currentDocument.content);
      if (currentContent !== newContent) {
        editor.commands.setContent(currentDocument.content);
      }
    }
  }, [currentDocument?.content, editor]);

  useEffect(() => {
    if (documentId) {
      joinDocument(documentId, 'Demo User', undefined);
      return () => leaveDocument(documentId);
    }
  }, [documentId, joinDocument, leaveDocument]);

  useEffect(() => {
    onContent(({ content }) => {
      if (editor) {
        const currentPos = editor.state.selection.from;
        editor.commands.setContent(content);
        editor.commands.setTextSelection(currentPos);
      }
    });
  }, [editor, onContent]);

  const handleSave = useCallback(async () => {
    if (!documentId || !editor) return;
    const content = editor.getJSON();
    await updateDocument(documentId, { content });
  }, [documentId, editor, updateDocument]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  const handleAnalyze = async (providerCountry?: string, getterCountry?: string) => {
    if (!documentId) return;
    setIsAnalyzing(true);
    try {
      const response = await compliance.analyze(documentId, { providerCountry, getterCountry });
      setComplianceReport(response.data);
      
      if (editor && response.data?.issues) {
        applyComplianceHighlights(editor, response.data.issues);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRefreshAnalysis = async () => {
    if (!documentId || !editor) return;
    setIsAnalyzing(true);
    try {
      const response = await compliance.analyze(documentId, {});
      setComplianceReport(response.data);
      
      if (response.data?.issues) {
        applyComplianceHighlights(editor, response.data.issues);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (!editor?.view) return;

    const handleMouseMove = (event: MouseEvent) => {
      const issue = getIssueFromCoords(editor, event.clientX, event.clientY);
      
      if (issue) {
        const fullIssue = complianceReport?.issues?.find((i: ComplianceIssue) => i.id === issue.id);
        setHoveredIssue(fullIssue || issue);
        setTooltipPosition({
          x: event.clientX + 10,
          y: event.clientY + 10,
        });
      } else {
        const tooltipEl = tooltipRef.current;
        if (tooltipEl) {
          const rect = tooltipEl.getBoundingClientRect();
          const isOverTooltip = 
            event.clientX >= rect.left && 
            event.clientX <= rect.right && 
            event.clientY >= rect.top && 
            event.clientY <= rect.bottom;
          
          if (!isOverTooltip) {
            setHoveredIssue(null);
          }
        } else {
          setHoveredIssue(null);
        }
      }
    };

    const container = editorContainerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, [editor, complianceReport]);

  const getSeverityIcon = (severity: string, issueType?: string) => {
    if (issueType === 'Fairness') {
      return <Scale className="h-4 w-4 text-violet-500 flex-shrink-0" />;
    }
    switch (severity) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />;
      default:
        return <Info className="h-4 w-4 text-yellow-500 flex-shrink-0" />;
    }
  };

  const getSeverityLabel = (severity: string, issueType?: string) => {
    if (issueType === 'Fairness') {
      switch (severity) {
        case 'error':
          return 'Fairness: Critical';
        case 'warning':
          return 'Fairness: Warning';
        default:
          return 'Fairness: Note';
      }
    }
    switch (severity) {
      case 'error':
        return 'Critical Issue';
      case 'warning':
        return 'Warning';
      default:
        return 'Suggestion';
    }
  };

  const getFavoredPartyBadge = (favoredParty?: string) => {
    if (!favoredParty || favoredParty === 'neutral') return null;
    const isLender = favoredParty === 'lender';
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
        isLender 
          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
          : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400'
      }`}>
        <Users className="h-3 w-3" />
        Favors {isLender ? 'Lender' : 'Borrower'}
      </span>
    );
  };

  const hasComplianceIssues = (complianceReport?.issues?.length || 0) > 0;

  return (
    <div className="flex flex-col h-full">
      <EditorToolbar
        editor={editor}
        onSave={handleSave}
        onAnalyze={() => setShowCompliance(true)}
        onRefreshAnalysis={handleRefreshAnalysis}
        onShare={() => setShowShare(true)}
        isSaving={isSaving}
        isAnalyzing={isAnalyzing}
        hasComplianceIssues={hasComplianceIssues}
      />

      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{currentDocument?.title || 'Untitled'}</span>
          {isSaving && <span className="text-xs text-muted-foreground">Saving...</span>}
          {isAnalyzing && <span className="text-xs text-orange-500">Analyzing...</span>}
          {hasComplianceIssues && !isAnalyzing && (
            <span className="text-xs text-orange-500 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {complianceReport.issues.length} issue{complianceReport.issues.length !== 1 ? 's' : ''} found
            </span>
          )}
        </div>
        <CollaboratorAvatars users={connectedUsers} />
      </div>

      <div className="flex-1 overflow-auto bg-background" ref={editorContainerRef}>
        <div className="max-w-4xl mx-auto my-8 bg-card shadow-finance-lg rounded-2xl min-h-[800px] border-0 p-8">
          <EditorContent editor={editor} />
        </div>

        {hoveredIssue && (
          <div 
            ref={tooltipRef}
            className={`fixed z-50 border rounded-lg shadow-xl p-4 max-w-md pointer-events-auto ${
              hoveredIssue.issueType === 'Fairness' 
                ? 'bg-violet-50 dark:bg-violet-950/90 border-violet-300 dark:border-violet-700' 
                : 'bg-popover border-border'
            }`}
            style={{ 
              left: Math.min(tooltipPosition.x, window.innerWidth - 420), 
              top: Math.min(tooltipPosition.y, window.innerHeight - 200),
            }}
            onMouseLeave={() => setHoveredIssue(null)}
          >
            <div className="flex items-start gap-3">
              {getSeverityIcon(hoveredIssue.severity, hoveredIssue.issueType)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className={`font-semibold text-sm ${
                    hoveredIssue.issueType === 'Fairness' ? 'text-violet-700 dark:text-violet-300' : ''
                  }`}>
                    {getSeverityLabel(hoveredIssue.severity, hoveredIssue.issueType)}
                  </span>
                  {hoveredIssue.category && (
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      hoveredIssue.issueType === 'Fairness' 
                        ? 'bg-violet-200 dark:bg-violet-800 text-violet-700 dark:text-violet-300' 
                        : 'bg-muted'
                    }`}>
                      {hoveredIssue.category}
                    </span>
                  )}
                </div>

                {hoveredIssue.favoredParty && hoveredIssue.favoredParty !== 'neutral' && (
                  <div className="mb-2">
                    {getFavoredPartyBadge(hoveredIssue.favoredParty)}
                  </div>
                )}
                
                {(hoveredIssue.regulation || hoveredIssue.jurisdiction) && (
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {hoveredIssue.regulation && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{hoveredIssue.regulation}</span>
                    )}
                    {hoveredIssue.jurisdiction && (
                      <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">{hoveredIssue.jurisdiction}</span>
                    )}
                  </div>
                )}
                
                <p className="text-sm text-foreground leading-relaxed">{hoveredIssue.message}</p>
                
                {hoveredIssue.suggestion && (
                  <div className={`text-xs border-t pt-2 mt-3 ${
                    hoveredIssue.issueType === 'Fairness' 
                      ? 'text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-700' 
                      : 'text-muted-foreground border-border'
                  }`}>
                    <span className="font-semibold text-primary">Suggestion:</span> {hoveredIssue.suggestion}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <CompliancePanel
        open={showCompliance}
        onOpenChange={setShowCompliance}
        report={complianceReport}
        isLoading={isAnalyzing}
        documentId={documentId}
        onAnalyze={handleAnalyze}
      />

      <ShareDialog
        open={showShare}
        onOpenChange={setShowShare}
        documentId={documentId}
      />
    </div>
  );
}
