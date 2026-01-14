import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { questionnaire as questionnaireApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Mic, MicOff, Loader2, Building2, CheckCircle, Check } from 'lucide-react';

interface Field {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'currency' | 'email' | 'phone' | 'multiselect' | 'percentage';
  placeholder: string;
  required: boolean;
  options?: string[];
  section: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  status: string;
  fields: Field[];
}

const DEMO_DATA: Record<string, string> = {
  commitment_amount: '150000000',
  final_maturity_date: '2031-12-31',
  margin_rate: '1.25',
  reference_rate: 'SOFR',
  eligible_projects: 'Construction and operation of onshore wind farms and solar photovoltaic installations across Europe',
  project_capacity: '5000',
  emissions_avoided: '8500000',
  reporting_frequency: 'Semi-annually',
  reporting_deadline: '120',
  external_reviewer: 'Sustainalytics',
};

export function QuestionnairePage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  
  const [template, setTemplate] = useState<Template | null>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordingSection, setRecordingSection] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (templateId) {
      loadTemplate();
    }
  }, [templateId]);

  const loadTemplate = async () => {
    try {
      const response = await questionnaireApi.getTemplate(templateId!);
      const loadedTemplate = response.data as Template;
      setTemplate(loadedTemplate);
      
      const sections = [...new Set(loadedTemplate.fields.map(f => f.section))];
      const firstSection = sections[0];
      
      const prefilled: Record<string, string> = {};
      for (const field of loadedTemplate.fields) {
        if (field.section !== firstSection && DEMO_DATA[field.id]) {
          prefilled[field.id] = DEMO_DATA[field.id];
        }
      }
      setAnswers(prefilled);
    } finally {
      setIsLoading(false);
    }
  };

  const sections = template ? [...new Set(template.fields.map(f => f.section))] : [];
  const currentSection = sections[currentSectionIndex] || '';
  const currentSectionFields = template?.fields.filter(f => f.section === currentSection) || [];
  const allFields = template?.fields || [];
  const filledFieldsCount = allFields.filter(f => answers[f.id] && answers[f.id].trim() !== '').length;
  const progress = template ? (filledFieldsCount / template.fields.length) * 100 : 0;

  const navigateToSection = (sectionIndex: number) => {
    setCurrentSectionIndex(sectionIndex);
  };

  const handleAnswerChange = (fieldId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleMultiSelectToggle = (fieldId: string, option: string) => {
    const current = answers[fieldId] ? answers[fieldId].split(', ') : [];
    const updated = current.includes(option)
      ? current.filter(o => o !== option)
      : [...current, option];
    setAnswers((prev) => ({ ...prev, [fieldId]: updated.join(', ') }));
  };

  const startSectionRecording = async (sectionName: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processSectionAudio(sectionName, audioBlob);
      };

      mediaRecorder.start();
      setRecordingSection(sectionName);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingSection) {
      mediaRecorderRef.current.stop();
      setRecordingSection(null);
    }
  };

  const processSectionAudio = async (sectionName: string, audioBlob: Blob) => {
    if (!templateId) return;
    
    setIsProcessing(true);
    try {
      const response = await questionnaireApi.processSectionVoice(templateId, sectionName, audioBlob);
      const mappedAnswers = response.data.mappedFields || {};

      setAnswers((prev) => ({ ...prev, ...mappedAnswers }));
    } catch (error) {
      console.error('Failed to process audio:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async () => {
    if (!templateId || !validateAllRequired()) return;
    
    setIsSubmitting(true);
    try {
      const response = await questionnaireApi.fillTemplate(templateId, answers);
      console.log('Full response:', response);
      console.log('Response data:', response.data);
      
      const document = response.data;
      const documentId = document?.id;
      
      if (!documentId) {
        console.error('No document ID in response:', response);
        alert('Document created but ID not found. Please check the console for details.');
        setIsSubmitting(false);
        return;
      }
      
      console.log('Navigating to document:', documentId);
      navigate(`/documents/${documentId}`, { replace: true });
    } catch (error: any) {
      console.error('Failed to create document:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        data: error.response?.data,
      });
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create document';
      alert(`Error: ${errorMessage}`);
      setIsSubmitting(false);
    }
  };

  const validateAllRequired = () => {
    if (!template) return false;
    return template.fields.every(field => {
      if (!field.required) return true;
      const answer = answers[field.id];
      return answer && answer.trim() !== '';
    });
  };

  const getInputType = (fieldType: string) => {
    switch (fieldType) {
      case 'email': return 'email';
      case 'phone': return 'tel';
      case 'number':
      case 'currency':
      case 'percentage': return 'number';
      case 'date': return 'date';
      default: return 'text';
    }
  };

  const renderField = (field: Field) => {
    const value = answers[field.id] || '';

    if (field.type === 'select') {
      return (
        <Select value={value} onValueChange={(v) => handleAnswerChange(field.id, v)}>
          <SelectTrigger className="h-14 text-base rounded-xl border-border/50 shadow-finance">
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((option) => (
              <SelectItem key={option} value={option}>{option}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (field.type === 'multiselect') {
      const selected = value ? value.split(', ') : [];
      return (
        <div className="grid grid-cols-2 gap-3">
          {field.options?.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => handleMultiSelectToggle(field.id, option)}
              className={`p-4 text-left text-sm rounded-xl border transition-all ${
                selected.includes(option)
                  ? 'bg-primary text-primary-foreground border-primary shadow-finance'
                  : 'bg-background border-border/50 hover:bg-accent/50 hover:border-border shadow-finance'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                  selected.includes(option) ? 'bg-primary-foreground border-primary-foreground' : 'border-border'
                }`}>
                  {selected.includes(option) && <Check className="h-3 w-3 text-primary" />}
                </div>
                {option}
              </div>
            </button>
          ))}
        </div>
      );
    }

    return (
      <div className="relative">
        <Input
          type={getInputType(field.type)}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => handleAnswerChange(field.id, e.target.value)}
          className={`h-14 text-base rounded-xl border-border/50 shadow-finance ${
            field.type === 'currency' ? 'pl-8' : 'pl-4'
          } ${field.type === 'percentage' ? 'pr-8' : 'pr-4'}`}
        />
        {field.type === 'currency' && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
        )}
        {field.type === 'percentage' && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">%</span>
        )}
      </div>
    );
  };

  const getSectionProgress = (sectionName: string) => {
    const sectionFields = template?.fields.filter(f => f.section === sectionName) || [];
    const filledCount = sectionFields.filter(f => answers[f.id] && answers[f.id].trim() !== '').length;
    return sectionFields.length > 0 ? (filledCount / sectionFields.length) * 100 : 0;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Template not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          className="mb-8 rounded-xl"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Templates
        </Button>

        <Card className="overflow-hidden border-0 shadow-finance-xl bg-card" style={{ borderRadius: '24px' }}>
          <div className="h-1.5 bg-primary" style={{ width: `${progress}%` }} />
          
          <CardHeader className="text-center pb-4 pt-10 px-10">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
              <Building2 className="h-8 w-8 text-primary stroke-[1.5]" />
            </div>
            <CardTitle className="text-2xl font-semibold text-foreground mb-2">{template.name}</CardTitle>
            <p className="text-sm text-muted-foreground leading-relaxed">{template.description}</p>
          </CardHeader>

          <CardContent className="space-y-8 px-10 pb-10">
            <div className="flex items-center justify-between text-sm">
              <div className="flex gap-2">
                {sections.map((section, idx) => {
                  const sectionProgress = getSectionProgress(section);
                  const isComplete = sectionProgress === 100;
                  return (
                    <button
                      key={section}
                      onClick={() => navigateToSection(idx)}
                      className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                        idx === currentSectionIndex
                          ? 'bg-primary text-primary-foreground shadow-finance'
                          : isComplete
                          ? 'bg-primary/80 text-primary-foreground shadow-finance'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {isComplete ? <Check className="h-3 w-3 inline" /> : idx + 1}
                    </button>
                  );
                })}
              </div>
              <span className="text-muted-foreground font-medium">
                {filledFieldsCount} of {template.fields.length} fields completed
              </span>
            </div>

            {currentSection && (
              <div className="space-y-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {currentSection}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {currentSectionFields.filter(f => answers[f.id] && answers[f.id].trim() !== '').length} of {currentSectionFields.length} fields filled
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant={recordingSection === currentSection ? 'destructive' : 'outline'}
                    size="lg"
                    className="rounded-xl border-border/50 shadow-finance"
                    onClick={() => recordingSection === currentSection ? stopRecording() : startSectionRecording(currentSection)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : recordingSection === currentSection ? (
                      <>
                        <MicOff className="h-4 w-4 mr-2" />
                        Stop Recording
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4 mr-2" />
                        Voice Input
                      </>
                    )}
                  </Button>
                </div>

                <div className="space-y-6">
                  {currentSectionFields.map((field) => (
                    <div key={field.id} className="space-y-3">
                      <Label className="text-base font-semibold text-foreground">
                        {field.label}
                        {field.required && <span className="text-destructive ml-1.5">*</span>}
                      </Label>
                      {renderField(field)}
                      {field.type === 'currency' && (
                        <p className="text-xs text-muted-foreground">Enter amount in USD</p>
                      )}
                      {field.type === 'percentage' && (
                        <p className="text-xs text-muted-foreground">Enter percentage value (0-100)</p>
                      )}
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground flex items-center gap-2 pt-2">
                  <Mic className="h-3.5 w-3.5" /> Use voice input to fill multiple fields at once
                </p>
              </div>
            )}

            <div className="flex justify-between pt-6 border-t border-border/50">
              <Button
                variant="outline"
                onClick={() => navigateToSection(Math.max(0, currentSectionIndex - 1))}
                disabled={currentSectionIndex === 0}
                className="px-8 h-12 rounded-xl border-border/50 shadow-finance"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous Section
              </Button>

              {currentSectionIndex === sections.length - 1 ? (
                <Button
                  onClick={handleSubmit}
                  disabled={!validateAllRequired() || isSubmitting}
                  className="px-8 h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-finance-lg"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Generate Document
                </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={() => navigateToSection(Math.min(sections.length - 1, currentSectionIndex + 1))}
                  className="px-8 h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-finance-lg"
                >
                  Next Section
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
