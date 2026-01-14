import { Mark, mergeAttributes } from '@tiptap/core';

export interface ComplianceHighlightOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    complianceHighlight: {
      setComplianceHighlight: (attributes: { severity: string; issueId: string; message: string; category?: string; regulation?: string; suggestion?: string; jurisdiction?: string }) => ReturnType;
      unsetComplianceHighlight: () => ReturnType;
      clearAllComplianceHighlights: () => ReturnType;
    };
  }
}

export const ComplianceHighlight = Mark.create<ComplianceHighlightOptions>({
  name: 'complianceHighlight',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      severity: {
        default: 'info',
        parseHTML: element => element.getAttribute('data-severity'),
        renderHTML: attributes => ({ 'data-severity': attributes.severity }),
      },
      issueId: {
        default: null,
        parseHTML: element => element.getAttribute('data-issue-id'),
        renderHTML: attributes => ({ 'data-issue-id': attributes.issueId }),
      },
      message: {
        default: '',
        parseHTML: element => element.getAttribute('data-message'),
        renderHTML: attributes => ({ 'data-message': attributes.message }),
      },
      category: {
        default: '',
        parseHTML: element => element.getAttribute('data-category'),
        renderHTML: attributes => ({ 'data-category': attributes.category }),
      },
      regulation: {
        default: '',
        parseHTML: element => element.getAttribute('data-regulation'),
        renderHTML: attributes => ({ 'data-regulation': attributes.regulation }),
      },
      suggestion: {
        default: '',
        parseHTML: element => element.getAttribute('data-suggestion'),
        renderHTML: attributes => ({ 'data-suggestion': attributes.suggestion }),
      },
      jurisdiction: {
        default: '',
        parseHTML: element => element.getAttribute('data-jurisdiction'),
        renderHTML: attributes => ({ 'data-jurisdiction': attributes.jurisdiction }),
      },
      issueType: {
        default: '',
        parseHTML: element => element.getAttribute('data-issue-type'),
        renderHTML: attributes => ({ 'data-issue-type': attributes.issueType }),
      },
      favoredParty: {
        default: '',
        parseHTML: element => element.getAttribute('data-favored-party'),
        renderHTML: attributes => ({ 'data-favored-party': attributes.favoredParty }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-compliance-highlight]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const severity = HTMLAttributes['data-severity'] || 'info';
    const issueType = HTMLAttributes['data-issue-type'] || '';
    const baseClasses = 'compliance-highlight cursor-pointer transition-all duration-200';
    
    const isFairness = issueType === 'Fairness';
    
    const lmaSeverityClasses: Record<string, string> = {
      error: 'bg-red-200/70 dark:bg-red-900/50 border-b-2 border-red-500 hover:bg-red-300/80',
      warning: 'bg-orange-200/70 dark:bg-orange-900/50 border-b-2 border-orange-500 hover:bg-orange-300/80',
      info: 'bg-yellow-200/70 dark:bg-yellow-900/50 border-b-2 border-yellow-500 hover:bg-yellow-300/80',
    };

    const fairnessSeverityClasses: Record<string, string> = {
      error: 'bg-violet-300/70 dark:bg-violet-900/50 border-b-2 border-violet-600 hover:bg-violet-400/80',
      warning: 'bg-violet-200/70 dark:bg-violet-900/40 border-b-2 border-violet-500 hover:bg-violet-300/80',
      info: 'bg-violet-100/70 dark:bg-violet-900/30 border-b-2 border-violet-400 hover:bg-violet-200/80',
    };

    const severityClasses = isFairness ? fairnessSeverityClasses : lmaSeverityClasses;

    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-compliance-highlight': '',
        class: `${baseClasses} ${severityClasses[severity] || severityClasses.info}`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setComplianceHighlight:
        attributes =>
        ({ commands }) => commands.setMark(this.name, attributes),
      unsetComplianceHighlight:
        () =>
        ({ commands }) => commands.unsetMark(this.name),
      clearAllComplianceHighlights:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            const { doc } = tr;
            doc.descendants((node, pos) => {
              if (node.isText) {
                const marks = node.marks.filter(mark => mark.type.name === this.name);
                marks.forEach(mark => {
                  tr.removeMark(pos, pos + node.nodeSize, mark.type);
                });
              }
            });
          }
          return true;
        },
    };
  },
});

export interface ComplianceIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  suggestion?: string;
  regulation?: string;
  jurisdiction?: string;
  textMatch?: string;
  startOffset?: number;
  endOffset?: number;
  issueType?: 'LMA Compliance' | 'Fairness';
  favoredParty?: 'lender' | 'borrower' | 'neutral';
}

interface PlainTextMapping {
  text: string;
  posMap: number[];
}

export function buildPlainTextMap(doc: any): PlainTextMapping {
  const textParts: string[] = [];
  const posMap: number[] = [];
  
  doc.descendants((node: any, pos: number) => {
    if (node.isText && node.text) {
      for (let i = 0; i < node.text.length; i++) {
        posMap.push(pos + i);
        textParts.push(node.text[i]);
      }
    } else if (node.isBlock && textParts.length > 0 && textParts[textParts.length - 1] !== ' ') {
      posMap.push(pos);
      textParts.push(' ');
    }
  });
  
  return {
    text: textParts.join(''),
    posMap,
  };
}

export function extractPlainText(doc: any): string {
  return buildPlainTextMap(doc).text;
}

function findTextInDocument(mapping: PlainTextMapping, searchText: string, startOffset?: number): { from: number; to: number } | null {
  const lowerText = mapping.text.toLowerCase();
  const lowerSearch = searchText.toLowerCase();
  
  let searchStart = 0;
  if (startOffset !== undefined && startOffset >= 0 && startOffset < mapping.text.length) {
    const nearStart = Math.max(0, startOffset - 50);
    const nearEnd = Math.min(mapping.text.length, startOffset + searchText.length + 50);
    const nearbyText = lowerText.slice(nearStart, nearEnd);
    const foundInNearby = nearbyText.indexOf(lowerSearch);
    if (foundInNearby !== -1) {
      searchStart = nearStart + foundInNearby;
    } else {
      searchStart = lowerText.indexOf(lowerSearch);
    }
  } else {
    searchStart = lowerText.indexOf(lowerSearch);
  }
  
  if (searchStart === -1) return null;
  
  const from = mapping.posMap[searchStart];
  const endIndex = Math.min(searchStart + searchText.length - 1, mapping.posMap.length - 1);
  const to = mapping.posMap[endIndex] + 1;
  
  if (from === undefined || to === undefined) return null;
  
  return { from, to };
}

function findPositionByOffset(mapping: PlainTextMapping, offset: number): number | null {
  if (offset < 0 || offset >= mapping.posMap.length) return null;
  return mapping.posMap[offset];
}

export function applyComplianceHighlights(
  editor: any,
  issues: ComplianceIssue[],
  _documentText?: string
) {
  if (!editor || !issues || issues.length === 0) {
    if (editor) {
      editor.commands.clearAllComplianceHighlights();
    }
    return;
  }

  const { state } = editor;
  const { tr, doc, schema } = state;
  const markType = schema.marks.complianceHighlight;
  
  if (!markType) return;

  doc.descendants((node: any, pos: number) => {
    if (node.isText) {
      const marks = node.marks.filter((mark: any) => mark.type.name === 'complianceHighlight');
      marks.forEach((mark: any) => {
        tr.removeMark(pos, pos + node.nodeSize, mark.type);
      });
    }
  });

  const mapping = buildPlainTextMap(doc);
  
  const validIssues = issues.filter(issue => 
    issue.textMatch && issue.textMatch.length > 0
  );

  const sortedIssues = [...validIssues].sort((a, b) => {
    const aOffset = a.startOffset ?? Infinity;
    const bOffset = b.startOffset ?? Infinity;
    return bOffset - aOffset;
  });

  for (const issue of sortedIssues) {
    if (!issue.textMatch) continue;

    let range: { from: number; to: number } | null = null;

    if (issue.startOffset !== undefined && issue.endOffset !== undefined) {
      const from = findPositionByOffset(mapping, issue.startOffset);
      const to = findPositionByOffset(mapping, issue.endOffset - 1);
      
      if (from !== null && to !== null) {
        range = { from, to: to + 1 };
      }
    }

    if (!range) {
      range = findTextInDocument(mapping, issue.textMatch, issue.startOffset);
    }

    if (range && range.from < range.to && range.from >= 0 && range.to <= doc.content.size) {
      const mark = markType.create({
        severity: issue.severity,
        issueId: issue.id,
        message: issue.message,
        category: issue.category || '',
        regulation: issue.regulation || '',
        suggestion: issue.suggestion || '',
        jurisdiction: issue.jurisdiction || '',
        issueType: issue.issueType || '',
        favoredParty: issue.favoredParty || '',
      });

      tr.addMark(range.from, range.to, mark);
    }
  }

  if (tr.docChanged) {
    editor.view.dispatch(tr);
  }
}

export function getIssueAtPosition(editor: any, pos: number): ComplianceIssue | null {
  if (!editor || pos < 0) return null;

  try {
    const $pos = editor.state.doc.resolve(pos);
    const marks = $pos.marks();
    
    const highlightMark = marks.find((mark: any) => mark.type.name === 'complianceHighlight');

    if (highlightMark) {
      return {
        id: highlightMark.attrs.issueId || '',
        severity: highlightMark.attrs.severity || 'info',
        category: highlightMark.attrs.category || 'Compliance',
        message: highlightMark.attrs.message || '',
        suggestion: highlightMark.attrs.suggestion || undefined,
        regulation: highlightMark.attrs.regulation || undefined,
        jurisdiction: highlightMark.attrs.jurisdiction || undefined,
        issueType: highlightMark.attrs.issueType || undefined,
        favoredParty: highlightMark.attrs.favoredParty || undefined,
      };
    }
  } catch (e) {
    return null;
  }

  return null;
}

export function getIssueFromCoords(editor: any, x: number, y: number): ComplianceIssue | null {
  if (!editor?.view) return null;

  try {
    const posInfo = editor.view.posAtCoords({ left: x, top: y });
    if (!posInfo) return null;

    return getIssueAtPosition(editor, posInfo.pos);
  } catch (e) {
    return null;
  }
}
