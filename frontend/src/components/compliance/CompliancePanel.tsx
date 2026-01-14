import { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle, Loader2, MapPin, Globe, Scale, FileCheck, Users } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { compliance } from '@/lib/api';

interface ComplianceIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  suggestion?: string;
  regulation?: string;
  jurisdiction?: string;
  issueType?: 'LMA Compliance' | 'Fairness';
  favoredParty?: 'lender' | 'borrower' | 'neutral';
}

interface ComplianceReport {
  id: string;
  score: number;
  issues: ComplianceIssue[];
  analyzedAt: string;
}

interface EUCountry {
  code: string;
  name: string;
}

interface CompliancePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ComplianceReport | null;
  isLoading: boolean;
  documentId?: string;
  onAnalyze?: (providerCountry?: string, getterCountry?: string) => void;
}

const Sheet_ = ({ children, open, onOpenChange }: { children: React.ReactNode; open: boolean; onOpenChange: (open: boolean) => void }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="fixed right-0 top-0 h-full w-[480px] bg-background border-l shadow-lg">
        {children}
      </div>
    </div>
  );
};

export function CompliancePanel({ open, onOpenChange, report, isLoading, documentId, onAnalyze }: CompliancePanelProps) {
  const [countries, setCountries] = useState<EUCountry[]>([]);
  const [providerCountry, setProviderCountry] = useState<string>('');
  const [getterCountry, setGetterCountry] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('all');

  useEffect(() => {
    if (open) {
      compliance.getEUCountries().then(res => {
        setCountries(res.data);
      }).catch(console.error);
    }
  }, [open]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getSeverityIcon = (severity: string, issueType?: string) => {
    if (issueType === 'Fairness') {
      return <Scale className="h-4 w-4 text-violet-500" />;
    }
    switch (severity) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityBg = (severity: string, issueType?: string) => {
    if (issueType === 'Fairness') {
      switch (severity) {
        case 'error':
          return 'bg-violet-100 dark:bg-violet-950/40 border-violet-300 dark:border-violet-800';
        case 'warning':
          return 'bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-900';
        default:
          return 'bg-violet-50/50 dark:bg-violet-950/20 border-violet-100 dark:border-violet-900/50';
      }
    }
    switch (severity) {
      case 'error':
        return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900';
      case 'warning':
        return 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900';
      default:
        return 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900';
    }
  };

  const getFavoredPartyBadge = (favoredParty?: string) => {
    if (!favoredParty || favoredParty === 'neutral') return null;
    
    const isLender = favoredParty === 'lender';
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
        isLender 
          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' 
          : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400'
      }`}>
        <Users className="h-3 w-3 inline mr-1" />
        Favors {isLender ? 'Lender' : 'Borrower'}
      </span>
    );
  };

  const lmaIssues = report?.issues.filter(i => i.issueType !== 'Fairness') || [];
  const fairnessIssues = report?.issues.filter(i => i.issueType === 'Fairness') || [];
  
  const getFilteredIssues = () => {
    if (!report) return [];
    switch (activeTab) {
      case 'lma':
        return lmaIssues;
      case 'fairness':
        return fairnessIssues;
      default:
        return report.issues;
    }
  };

  const filteredIssues = getFilteredIssues();
  
  const errorCount = filteredIssues.filter(i => i.severity === 'error').length;
  const warningCount = filteredIssues.filter(i => i.severity === 'warning').length;
  const infoCount = filteredIssues.filter(i => i.severity === 'info').length;

  const handleAnalyze = () => {
    if (onAnalyze) {
      onAnalyze(providerCountry || undefined, getterCountry || undefined);
    }
  };

  return (
    <Sheet_ open={open} onOpenChange={onOpenChange}>
      <div className="flex flex-col h-full">
        <div className="p-6 border-b">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold font-display">Compliance Analysis</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            LMA regulations and contract fairness checks
          </p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6">
            <div className="space-y-4 mb-6 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4" />
                Location-Based Compliance
              </div>
              
              <div className="grid gap-3">
                <div className="space-y-2">
                  <Label htmlFor="provider-country">Provider Location</Label>
                  <Select value={providerCountry} onValueChange={setProviderCountry}>
                    <SelectTrigger id="provider-country">
                      <SelectValue placeholder="Select provider country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">EU-wide only</SelectItem>
                      {countries.map(country => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="getter-country">Recipient Location</Label>
                  <Select value={getterCountry} onValueChange={setGetterCountry}>
                    <SelectTrigger id="getter-country">
                      <SelectValue placeholder="Select recipient country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">EU-wide only</SelectItem>
                      {countries.map(country => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleAnalyze} disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  'Run Compliance Check'
                )}
              </Button>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-4 text-sm text-muted-foreground">Analyzing document...</p>
              </div>
            ) : report ? (
              <div className="space-y-6">
                <div className="text-center">
                  <div className={`text-5xl font-bold font-display ${getScoreColor(report.score)}`}>
                    {report.score}%
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Overall Compliance Score</p>
                  <Progress value={report.score} className="mt-3" />
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="all" className="text-xs">
                      All ({report.issues.length})
                    </TabsTrigger>
                    <TabsTrigger value="lma" className="text-xs">
                      <FileCheck className="h-3 w-3 mr-1" />
                      LMA ({lmaIssues.length})
                    </TabsTrigger>
                    <TabsTrigger value="fairness" className="text-xs">
                      <Scale className="h-3 w-3 mr-1" />
                      Fairness ({fairnessIssues.length})
                    </TabsTrigger>
                  </TabsList>

                  <div className="mt-4">
                    <div className="grid grid-cols-3 gap-3 text-center mb-4">
                      <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                        <div className="text-xl font-bold text-red-500">{errorCount}</div>
                        <div className="text-xs text-muted-foreground">Critical</div>
                      </div>
                      <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                        <div className="text-xl font-bold text-orange-500">{warningCount}</div>
                        <div className="text-xs text-muted-foreground">Warnings</div>
                      </div>
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                        <div className="text-xl font-bold text-blue-500">{infoCount}</div>
                        <div className="text-xs text-muted-foreground">Info</div>
                      </div>
                    </div>

                    {activeTab === 'fairness' && fairnessIssues.length > 0 && (
                      <div className="mb-4 p-3 bg-violet-50/50 dark:bg-violet-950/20 rounded-lg border border-violet-200 dark:border-violet-900">
                        <div className="flex items-center gap-2 text-sm font-medium text-violet-700 dark:text-violet-300">
                          <Scale className="h-4 w-4" />
                          Fairness Analysis Summary
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            Lender-favoring: {fairnessIssues.filter(i => i.favoredParty === 'lender').length}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-cyan-500" />
                            Borrower-favoring: {fairnessIssues.filter(i => i.favoredParty === 'borrower').length}
                          </div>
                        </div>
                      </div>
                    )}

                    {filteredIssues.length > 0 ? (
                      <div className="space-y-3">
                        <h3 className="font-medium text-sm text-muted-foreground">
                          {activeTab === 'all' ? 'All Issues' : activeTab === 'lma' ? 'LMA Compliance Issues' : 'Fairness Issues'}
                        </h3>
                        {filteredIssues.map((issue) => (
                          <div
                            key={issue.id}
                            className={`p-3 rounded-lg border ${getSeverityBg(issue.severity, issue.issueType)}`}
                          >
                            <div className="flex items-start gap-2">
                              {getSeverityIcon(issue.severity, issue.issueType)}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className={`text-xs font-semibold uppercase ${
                                    issue.issueType === 'Fairness' ? 'text-violet-600 dark:text-violet-400' : 'text-muted-foreground'
                                  }`}>
                                    {issue.category}
                                  </span>
                                  {issue.issueType === 'Fairness' && (
                                    <span className="text-xs bg-violet-200 dark:bg-violet-800 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded">
                                      Fairness
                                    </span>
                                  )}
                                  {issue.regulation && (
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                      {issue.regulation}
                                    </span>
                                  )}
                                  {issue.jurisdiction && (
                                    <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                                      {issue.jurisdiction}
                                    </span>
                                  )}
                                </div>
                                {getFavoredPartyBadge(issue.favoredParty)}
                                <p className="text-sm mt-1 leading-relaxed">{issue.message}</p>
                                {issue.suggestion && (
                                  <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-current/10">
                                    <span className="font-semibold text-primary">Suggestion:</span> {issue.suggestion}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                        <p className="mt-2 font-medium">
                          {activeTab === 'all' ? 'All checks passed!' : 
                           activeTab === 'lma' ? 'LMA compliance checks passed!' : 
                           'No fairness issues found!'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {activeTab === 'fairness' 
                            ? 'The contract appears balanced between parties.'
                            : 'Your document meets regulatory requirements.'}
                        </p>
                      </div>
                    )}
                  </div>
                </Tabs>
              </div>
            ) : (
              <div className="text-center py-12">
                <Globe className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
                <p className="text-muted-foreground mt-4">
                  Select locations and click "Run Compliance Check" to analyze your document.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </Sheet_>
  );
}
