import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentsService } from '../documents/documents.service';
import { SttService } from '../stt/stt.service';
import OpenAI from 'openai';

export interface QuestionnaireField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'currency' | 'email' | 'phone' | 'multiselect' | 'percentage';
  placeholder: string;
  required: boolean;
  options?: string[];
  section: string;
}

export interface LoanTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'active' | 'coming_soon';
  fields: QuestionnaireField[];
  documentContent: any;
}

const LOAN_TEMPLATES: LoanTemplate[] = [
  {
    id: 'green-building',
    name: 'Green Loan Agreement',
    description: 'Finance renewable energy and sustainable projects aligned with Green Loan Principles.',
    category: 'Sustainability',
    status: 'active',
    fields: [
      { id: 'lender_name', label: 'Lender Name', type: 'text', placeholder: 'HSBC Bank PLC', required: true, section: 'Parties' },
      { id: 'borrower_name', label: 'Borrower / Company Name', type: 'text', placeholder: 'NextEra Energy Partners, LP', required: true, section: 'Parties' },
      { id: 'agreement_date', label: 'Agreement Date', type: 'date', placeholder: '', required: true, section: 'Parties' },
      
      { id: 'commitment_amount', label: 'Commitment Amount (USD)', type: 'currency', placeholder: '1500000000', required: true, section: 'Facility Terms' },
      { id: 'final_maturity_date', label: 'Final Maturity Date', type: 'date', placeholder: '', required: true, section: 'Facility Terms' },
      { id: 'margin_rate', label: 'Margin Rate (%)', type: 'percentage', placeholder: '1.25', required: true, section: 'Facility Terms' },
      { id: 'reference_rate', label: 'Reference Rate', type: 'select', placeholder: '', required: true, options: ['SOFR', 'EURIBOR', 'SONIA', 'Other'], section: 'Facility Terms' },
      
      { id: 'eligible_projects', label: 'Eligible Green Projects Description', type: 'text', placeholder: 'Renewable energy projects, energy efficiency, etc.', required: true, section: 'Use of Proceeds' },
      { id: 'project_capacity', label: 'Total Project Capacity (MW)', type: 'number', placeholder: '5000', required: true, section: 'Use of Proceeds' },
      { id: 'emissions_avoided', label: 'Annual GHG Emissions Avoided (tonnes CO2e)', type: 'number', placeholder: '8500000', required: true, section: 'Use of Proceeds' },
      
      { id: 'reporting_frequency', label: 'Reporting Frequency', type: 'select', placeholder: '', required: true, options: ['Annually', 'Semi-annually', 'Quarterly'], section: 'Reporting' },
      { id: 'reporting_deadline', label: 'Reporting Deadline (days after period end)', type: 'number', placeholder: '120', required: true, section: 'Reporting' },
      { id: 'external_reviewer', label: 'External Reviewer Name', type: 'text', placeholder: 'Sustainalytics', required: false, section: 'Reporting' },
    ],
    documentContent: {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'GREEN LOAN AGREEMENT' }] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'DATE: ' }, { type: 'text', text: '{{agreement_date}}' }] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'PARTIES:' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '(1) ' }, { type: 'text', marks: [{ type: 'bold' }], text: '{{lender_name}}' }, { type: 'text', text: ' (the "Lender")' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '(2) ' }, { type: 'text', marks: [{ type: 'bold' }], text: '{{borrower_name}}' }, { type: 'text', text: ' (the "Borrower")' }] },
        { type: 'horizontalRule' },
        
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '1. THE FACILITY' }] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: '1.1 The Facility' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Subject to the terms of this Agreement, the Lender makes available to the Borrower a term loan facility in an aggregate amount equal to the Commitment of USD {{commitment_amount}}.' }] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: '1.2 Repayment' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'The Borrower shall repay the Loan on the Final Maturity Date ({{final_maturity_date}}) in a single bullet payment.' }] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: '1.3 Interest Rate' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'The rate of interest applicable to the Loan is the aggregate of:' }] },
        { type: 'bulletList', content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'the Margin of {{margin_rate}}% per annum; and' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'the Reference Rate ({{reference_rate}}) for that Interest Period.' }] }] },
        ]},
        
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '2. PURPOSE AND USE OF PROCEEDS' }] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: '2.1 Purpose' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'The Borrower shall apply the proceeds of the Loan exclusively for Green Use of Proceeds in accordance with the Green Loan Framework, specifically for:' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '{{eligible_projects}}' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'The projects financed under this Agreement shall have a total capacity of approximately {{project_capacity}} MW and are expected to avoid approximately {{emissions_avoided}} tonnes of CO2 equivalent emissions annually.' }] },
        
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '3. GREEN LOAN FRAMEWORK' }] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: '3.1 Compliance with Green Loan Principles' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'This Agreement is structured in accordance with the four core components of the Green Loan Principles:' }] },
        { type: 'bulletList', content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Use of Proceeds: ' }, { type: 'text', text: 'The Loan proceeds shall be used exclusively for Eligible Green Projects' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Process for Project Evaluation and Selection: ' }, { type: 'text', text: 'The Borrower has established appropriate internal processes for evaluating and selecting Eligible Green Projects' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Management of Proceeds: ' }, { type: 'text', text: 'The Borrower shall maintain a register tracking the allocation of proceeds to Eligible Green Projects' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Reporting: ' }, { type: 'text', text: 'The Borrower shall provide Green Loan Reports {{reporting_frequency}}, within {{reporting_deadline}} days of each period end' }] }] },
        ]},
        
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '4. GREEN LOAN REPORTING AND REVIEW' }] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: '4.1 Green Loan Report' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'The Borrower shall provide to the Lender a comprehensive Green Loan Report {{reporting_frequency}}, within {{reporting_deadline}} days of the end of each reporting period.' }] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: '4.2 External Review' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'The Borrower shall obtain an External Review from {{external_reviewer}} or equivalent qualified reviewer annually. The External Review shall assess the allocation of proceeds, compliance with the Green Loan Framework, and the appropriateness of impact metrics.' }] },
        
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: '5. SIGNATURES' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'SIGNED by the parties on {{agreement_date}}:' }] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'LENDER: {{lender_name}}' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '____________________________________' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Signature                    Date' }] },
        { type: 'paragraph', content: [{ type: 'text', text: ' ' }] },
        { type: 'paragraph', content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'BORROWER: {{borrower_name}}' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '____________________________________' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Signature                    Date' }] },
      ],
    },
  },
  {
    id: 'solar-energy',
    name: 'Solar Energy Financing',
    description: 'Fund solar panel installations and renewable energy infrastructure projects.',
    category: 'Sustainability',
    status: 'coming_soon',
    fields: [],
    documentContent: { type: 'doc', content: [] },
  },
  {
    id: 'ev-vehicle',
    name: 'Electric Vehicle Loan',
    description: 'Special financing rates for electric and hybrid vehicle purchases.',
    category: 'Sustainability',
    status: 'coming_soon',
    fields: [],
    documentContent: { type: 'doc', content: [] },
  },
  {
    id: 'sustainable-agriculture',
    name: 'Sustainable Agriculture Loan',
    description: 'Support organic farming, regenerative agriculture, and eco-friendly practices.',
    category: 'Sustainability',
    status: 'coming_soon',
    fields: [],
    documentContent: { type: 'doc', content: [] },
  },
  {
    id: 'esg-corporate',
    name: 'ESG Corporate Loan',
    description: 'Corporate financing tied to environmental, social, and governance metrics.',
    category: 'Sustainability',
    status: 'coming_soon',
    fields: [],
    documentContent: { type: 'doc', content: [] },
  },
];

@Injectable()
export class QuestionnaireService {
  private openai: OpenAI | null = null;

  constructor(
    private documentsService: DocumentsService,
    private sttService: SttService,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  getTemplates() {
    return LOAN_TEMPLATES.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      status: t.status,
    }));
  }

  getTemplate(templateId: string) {
    const template = LOAN_TEMPLATES.find(t => t.id === templateId);
    if (!template) return null;
    return template;
  }

  getQuestionnaireFields(templateId: string) {
    const template = LOAN_TEMPLATES.find(t => t.id === templateId);
    if (!template) return [];
    return template.fields;
  }

  getSections(templateId: string) {
    const fields = this.getQuestionnaireFields(templateId);
    const sections = [...new Set(fields.map(f => f.section))];
    return sections.map(section => ({
      name: section,
      fields: fields.filter(f => f.section === section),
    }));
  }

  async processSectionVoice(templateId: string, sectionName: string, audioBuffer: Buffer, mimeType: string) {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    const sectionFields = template.fields.filter(f => f.section === sectionName);
    if (sectionFields.length === 0) {
      throw new Error('Section not found');
    }

    const transcription = await this.sttService.transcribe(audioBuffer, mimeType);
    const transcribedText = transcription.text;

    const fieldsDescription = sectionFields.map(f => {
      let desc = `- ${f.id}: ${f.label} (${f.type})`;
      if (f.options) {
        desc += ` - Options: ${f.options.join(', ')}`;
      }
      return desc;
    }).join('\n');

    const prompt = `You are extracting structured data from voice input for a loan application form.

Section: ${sectionName}

Available fields:
${fieldsDescription}

Voice input transcript: "${transcribedText}"

Extract the relevant information and map it to the fields. Return ONLY a valid JSON object with field IDs as keys and extracted values as strings. For multiselect fields, return comma-separated values. For select fields, match to the closest option. For numbers, return just the number without units or symbols. If a field is not mentioned, omit it from the response.

Example response format:
{
  "borrower_name": "Acme Corp",
  "contact_person": "John Smith",
  "borrower_phone": "555-123-4567"
}

Return only the JSON object, no other text:`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a data extraction assistant. Extract structured information from voice transcripts and return only valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const responseText = completion.choices[0]?.message?.content || '{}';
      const mappedFields = JSON.parse(responseText);

      return { mappedFields, transcription: transcribedText };
    } catch (error) {
      console.error('Failed to process voice with AI:', error);
      throw new Error('Failed to extract data from voice input');
    }
  }

  async fillTemplate(userId: string, templateId: string, answers: Record<string, string>) {
    const template = this.getTemplate(templateId);
    if (!template) throw new Error('Template not found');
    if (template.status !== 'active') throw new Error('Template not available');

    let content = JSON.stringify(template.documentContent);
    
    for (const [key, value] of Object.entries(answers)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      content = content.replace(regex, value);
    }

    const document = await this.documentsService.create(userId, {
      title: `${template.name} - ${new Date().toLocaleDateString()}`,
      content: JSON.parse(content),
      templateType: templateId,
    });

    return document;
  }
}
