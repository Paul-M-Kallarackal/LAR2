import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComplianceReport, ComplianceIssue, IssueSeverity, IssueType } from '../../database/entities/compliance-report.entity';
import { DocumentsService } from '../documents/documents.service';
import { EUCountry, EU_COUNTRY_NAMES } from '../../database/entities/location.entity';
import { v4 as uuidv4 } from 'uuid';

interface ComplianceRule {
  id: string;
  name: string;
  category: string;
  regulation: string;
  jurisdiction: 'EU' | EUCountry;
  severity: IssueSeverity;
  check: (content: any, extractedText: string) => ComplianceIssue | null;
}

interface PatternMatch {
  text: string;
  start: number;
  end: number;
}

function findAllMatches(text: string, pattern: RegExp): PatternMatch[] {
  const matches: PatternMatch[] = [];
  const globalPattern = new RegExp(pattern.source, 'gi');
  let match;
  while ((match = globalPattern.exec(text)) !== null) {
    matches.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return matches;
}

const EU_COMPLIANCE_RULES: ComplianceRule[] = [
  {
    id: 'ccd-aprc-disclosure',
    name: 'APRC Disclosure (Annual Percentage Rate of Charge)',
    category: 'Consumer Credit Directive',
    regulation: 'CCD Article 5',
    jurisdiction: 'EU',
    severity: IssueSeverity.ERROR,
    check: (content, text) => {
      const hasAPRC = /APRC|APR|annual percentage rate|taux annuel/i.test(text);
      if (!hasAPRC) {
        const loanTermsMatch = /loan terms|interest rate|borrowing rate|section.*loan/i.exec(text);
        const offset = loanTermsMatch ? loanTermsMatch.index : 0;
        return {
          id: uuidv4(),
          severity: IssueSeverity.ERROR,
          category: 'CCD',
          message: 'Missing APRC (Annual Percentage Rate of Charge) disclosure required by Consumer Credit Directive',
          suggestion: 'Add a clear APRC disclosure statement showing the total cost of credit',
          textMatch: loanTermsMatch ? loanTermsMatch[0] : 'Loan Terms section',
          startOffset: offset,
          endOffset: offset + (loanTermsMatch ? loanTermsMatch[0].length : 20),
          issueType: IssueType.LMA_COMPLIANCE,
        };
      }
      return null;
    },
  },
  {
    id: 'ccd-total-amount',
    name: 'Total Amount Payable',
    category: 'Consumer Credit Directive',
    regulation: 'CCD Article 5',
    jurisdiction: 'EU',
    severity: IssueSeverity.ERROR,
    check: (content, text) => {
      const hasTotal = /total amount payable|total cost|montant total|Gesamtbetrag/i.test(text);
      if (!hasTotal) {
        const loanAmountMatch = /loan amount|credit amount|principal amount/i.exec(text);
        const offset = loanAmountMatch ? loanAmountMatch.index : 0;
        return {
          id: uuidv4(),
          severity: IssueSeverity.ERROR,
          category: 'CCD',
          message: 'Missing total amount payable disclosure required by Consumer Credit Directive',
          suggestion: 'Include the total amount the consumer will pay including all interest and fees',
          textMatch: loanAmountMatch ? loanAmountMatch[0] : 'Loan Amount section',
          startOffset: offset,
          endOffset: offset + (loanAmountMatch ? loanAmountMatch[0].length : 20),
          issueType: IssueType.LMA_COMPLIANCE,
        };
      }
      return null;
    },
  },
  {
    id: 'ccd-withdrawal-right',
    name: 'Right of Withdrawal (14 days)',
    category: 'Consumer Credit Directive',
    regulation: 'CCD Article 14',
    jurisdiction: 'EU',
    severity: IssueSeverity.ERROR,
    check: (content, text) => {
      const hasWithdrawal = /right of withdrawal|withdrawal period|14 days|fourteen days|droit de rétractation|Widerrufsrecht/i.test(text);
      if (!hasWithdrawal) {
        return {
          id: uuidv4(),
          severity: IssueSeverity.ERROR,
          category: 'CCD',
          message: 'Missing 14-day right of withdrawal notice required by Consumer Credit Directive',
          suggestion: 'Add clear notice that the consumer has 14 days to withdraw from the credit agreement',
          issueType: IssueType.LMA_COMPLIANCE,
        };
      }
      return null;
    },
  },
  {
    id: 'ccd-early-repayment',
    name: 'Early Repayment Rights',
    category: 'Consumer Credit Directive',
    regulation: 'CCD Article 16',
    jurisdiction: 'EU',
    severity: IssueSeverity.WARNING,
    check: (content, text) => {
      const hasEarlyRepayment = /early repayment|prepayment|remboursement anticipé|vorzeitige Rückzahlung/i.test(text);
      if (!hasEarlyRepayment) {
        return {
          id: uuidv4(),
          severity: IssueSeverity.WARNING,
          category: 'CCD',
          message: 'Missing early repayment rights information required by Consumer Credit Directive',
          suggestion: 'Include terms for early repayment and any applicable compensation',
          issueType: IssueType.LMA_COMPLIANCE,
        };
      }
      return null;
    },
  },
  {
    id: 'mcd-esis',
    name: 'ESIS Form (Mortgage)',
    category: 'Mortgage Credit Directive',
    regulation: 'MCD Article 14',
    jurisdiction: 'EU',
    severity: IssueSeverity.WARNING,
    check: (content, text) => {
      const isMortgage = /mortgage|hypothek|hipoteca|immobilier|property loan/i.test(text);
      const hasESIS = /ESIS|European Standardised Information Sheet|pre-contractual information/i.test(text);
      if (isMortgage && !hasESIS) {
        return {
          id: uuidv4(),
          severity: IssueSeverity.WARNING,
          category: 'MCD',
          message: 'Mortgage document should reference ESIS (European Standardised Information Sheet)',
          suggestion: 'Reference the ESIS form that must be provided before contract signing',
          issueType: IssueType.LMA_COMPLIANCE,
        };
      }
      return null;
    },
  },
  {
    id: 'mcd-reflection-period',
    name: 'Reflection Period (Mortgage)',
    category: 'Mortgage Credit Directive',
    regulation: 'MCD Article 14',
    jurisdiction: 'EU',
    severity: IssueSeverity.WARNING,
    check: (content, text) => {
      const isMortgage = /mortgage|hypothek|hipoteca|immobilier|property loan/i.test(text);
      const hasReflection = /reflection period|cooling off|7 days|seven days/i.test(text);
      if (isMortgage && !hasReflection) {
        return {
          id: uuidv4(),
          severity: IssueSeverity.WARNING,
          category: 'MCD',
          message: 'Mortgage document should mention reflection period under MCD',
          suggestion: 'Include information about the reflection period before signing',
          issueType: IssueType.LMA_COMPLIANCE,
        };
      }
      return null;
    },
  },
  {
    id: 'gdpr-data-processing',
    name: 'GDPR Data Processing Notice',
    category: 'GDPR',
    regulation: 'GDPR Article 13/14',
    jurisdiction: 'EU',
    severity: IssueSeverity.ERROR,
    check: (content, text) => {
      const hasDataNotice = /data processing|personal data|GDPR|data protection|Datenschutz|protection des données/i.test(text);
      if (!hasDataNotice) {
        return {
          id: uuidv4(),
          severity: IssueSeverity.ERROR,
          category: 'GDPR',
          message: 'Missing GDPR data processing notice',
          suggestion: 'Add clear explanation of how personal data will be processed and stored',
          issueType: IssueType.LMA_COMPLIANCE,
        };
      }
      return null;
    },
  },
  {
    id: 'gdpr-consent',
    name: 'GDPR Consent Collection',
    category: 'GDPR',
    regulation: 'GDPR Article 7',
    jurisdiction: 'EU',
    severity: IssueSeverity.WARNING,
    check: (content, text) => {
      const hasConsent = /consent|agree to|I agree|Einwilligung|consentement/i.test(text);
      if (!hasConsent) {
        return {
          id: uuidv4(),
          severity: IssueSeverity.WARNING,
          category: 'GDPR',
          message: 'Document should include explicit consent language for data processing',
          suggestion: 'Add consent checkbox or signature for data processing agreement',
          issueType: IssueType.LMA_COMPLIANCE,
        };
      }
      return null;
    },
  },
  {
    id: 'gdpr-data-rights',
    name: 'Data Subject Rights',
    category: 'GDPR',
    regulation: 'GDPR Articles 15-22',
    jurisdiction: 'EU',
    severity: IssueSeverity.INFO,
    check: (content, text) => {
      const hasRights = /right to access|right to erasure|right to rectification|data subject rights|Betroffenenrechte/i.test(text);
      if (!hasRights) {
        return {
          id: uuidv4(),
          severity: IssueSeverity.INFO,
          category: 'GDPR',
          message: 'Consider adding data subject rights information',
          suggestion: 'Include reference to access, rectification, and erasure rights',
          issueType: IssueType.LMA_COMPLIANCE,
        };
      }
      return null;
    },
  },
  {
    id: 'psd2-payment-info',
    name: 'Payment Services Information',
    category: 'PSD2',
    regulation: 'PSD2 Article 44',
    jurisdiction: 'EU',
    severity: IssueSeverity.INFO,
    check: (content, text) => {
      const hasPayment = /payment|direct debit|bank transfer|SEPA/i.test(text);
      const hasPaymentInfo = /payment terms|payment schedule|due date|fällig/i.test(text);
      if (hasPayment && !hasPaymentInfo) {
        return {
          id: uuidv4(),
          severity: IssueSeverity.INFO,
          category: 'PSD2',
          message: 'Payment information should be clearly specified',
          suggestion: 'Add clear payment schedule, methods, and due dates',
          issueType: IssueType.LMA_COMPLIANCE,
        };
      }
      return null;
    },
  },
  {
    id: 'signature-block',
    name: 'Signature Block Present',
    category: 'General',
    regulation: 'Contract Law',
    jurisdiction: 'EU',
    severity: IssueSeverity.ERROR,
    check: (content, text) => {
      const hasSignature = /signature|sign here|unterschrift|firma|signed by/i.test(text);
      if (!hasSignature) {
        return {
          id: uuidv4(),
          severity: IssueSeverity.ERROR,
          category: 'General',
          message: 'Document missing signature block',
          suggestion: 'Add signature lines for all parties to the agreement',
          issueType: IssueType.LMA_COMPLIANCE,
        };
      }
      return null;
    },
  },
  {
    id: 'date-field',
    name: 'Date Field Present',
    category: 'General',
    regulation: 'Contract Law',
    jurisdiction: 'EU',
    severity: IssueSeverity.WARNING,
    check: (content, text) => {
      const hasDate = /date:|effective date|dated|datum|fecha/i.test(text);
      if (!hasDate) {
        return {
          id: uuidv4(),
          severity: IssueSeverity.WARNING,
          category: 'General',
          message: 'Document may be missing an effective date field',
          suggestion: 'Include effective date of the agreement',
          issueType: IssueType.LMA_COMPLIANCE,
        };
      }
      return null;
    },
  },
  {
    id: 'borrower-info',
    name: 'Borrower Information',
    category: 'General',
    regulation: 'Contract Law',
    jurisdiction: 'EU',
    severity: IssueSeverity.ERROR,
    check: (content, text) => {
      const hasBorrower = /borrower|applicant|debtor|Kreditnehmer|emprunteur|prestatario/i.test(text);
      if (!hasBorrower) {
        return {
          id: uuidv4(),
          severity: IssueSeverity.ERROR,
          category: 'General',
          message: 'Document missing borrower identification',
          suggestion: 'Include borrower name and identifying information',
          issueType: IssueType.LMA_COMPLIANCE,
        };
      }
      return null;
    },
  },
  {
    id: 'loan-amount',
    name: 'Credit Amount Disclosure',
    category: 'Consumer Credit Directive',
    regulation: 'CCD Article 5',
    jurisdiction: 'EU',
    severity: IssueSeverity.ERROR,
    check: (content, text) => {
      const hasAmount = /loan amount|credit amount|principal|amount financed|€[\d,]+|EUR/i.test(text);
      if (!hasAmount) {
        return {
          id: uuidv4(),
          severity: IssueSeverity.ERROR,
          category: 'CCD',
          message: 'Credit amount not clearly disclosed',
          suggestion: 'Clearly state the total credit amount in EUR',
          issueType: IssueType.LMA_COMPLIANCE,
        };
      }
      return null;
    },
  },
  {
    id: 'interest-rate',
    name: 'Interest Rate Disclosure',
    category: 'Consumer Credit Directive',
    regulation: 'CCD Article 5',
    jurisdiction: 'EU',
    severity: IssueSeverity.ERROR,
    check: (content, text) => {
      const hasInterest = /interest rate|borrowing rate|%|percent|Zinssatz|taux d'intérêt/i.test(text);
      if (!hasInterest) {
        return {
          id: uuidv4(),
          severity: IssueSeverity.ERROR,
          category: 'CCD',
          message: 'Interest rate not clearly disclosed',
          suggestion: 'Include the borrowing rate and whether it is fixed or variable',
          issueType: IssueType.LMA_COMPLIANCE,
        };
      }
      return null;
    },
  },
  {
    id: 'duration-disclosure',
    name: 'Credit Duration',
    category: 'Consumer Credit Directive',
    regulation: 'CCD Article 5',
    jurisdiction: 'EU',
    severity: IssueSeverity.WARNING,
    check: (content, text) => {
      const hasDuration = /duration|term|months|years|Laufzeit|durée|duración/i.test(text);
      if (!hasDuration) {
        return {
          id: uuidv4(),
          severity: IssueSeverity.WARNING,
          category: 'CCD',
          message: 'Credit duration/term not specified',
          suggestion: 'Include the total duration of the credit agreement',
          issueType: IssueType.LMA_COMPLIANCE,
        };
      }
      return null;
    },
  },
  {
    id: 'de-bgb-form',
    name: 'Written Form Requirement (Germany)',
    category: 'German Civil Code',
    regulation: 'BGB §492',
    jurisdiction: EUCountry.GERMANY,
    severity: IssueSeverity.INFO,
    check: (content, text) => {
      const isGerman = /BGB|German|Deutschland|Bundesrepublik/i.test(text);
      const hasFormNote = /written form|schriftform|textform/i.test(text);
      if (isGerman && !hasFormNote) {
        return {
          id: uuidv4(),
          severity: IssueSeverity.INFO,
          category: 'BGB',
          message: 'German consumer credit agreements require written form under BGB §492',
          suggestion: 'Ensure document complies with German written form requirements',
          issueType: IssueType.LMA_COMPLIANCE,
        };
      }
      return null;
    },
  },
  {
    id: 'fr-code-consommation',
    name: 'French Consumer Code Reference',
    category: 'French Consumer Code',
    regulation: 'Code de la Consommation',
    jurisdiction: EUCountry.FRANCE,
    severity: IssueSeverity.INFO,
    check: (content, text) => {
      const isFrench = /France|français|République française/i.test(text);
      const hasCodeRef = /code de la consommation|L312|L313/i.test(text);
      if (isFrench && !hasCodeRef) {
        return {
          id: uuidv4(),
          severity: IssueSeverity.INFO,
          category: 'French Law',
          message: 'French credit agreements should reference Code de la Consommation',
          suggestion: 'Add reference to applicable French consumer protection articles',
          issueType: IssueType.LMA_COMPLIANCE,
        };
      }
      return null;
    },
  },
];

const GREEN_LOAN_RULES: ComplianceRule[] = [
  {
    id: 'gl-fossil-natural-gas',
    name: 'Fossil Fuel Reference - Natural Gas',
    category: 'Green Loan Principles',
    regulation: 'LMA GLP 2023',
    jurisdiction: 'EU',
    severity: IssueSeverity.ERROR,
    check: (content, text) => {
      const isGreenLoan = /green loan|green bond|sustainable finance|eligible green/i.test(text);
      if (!isGreenLoan) return null;
      
      const pattern = /natural gas|NGCC|combined cycle|gas-fired|gas turbine/gi;
      const matches = findAllMatches(text, pattern);
      
      if (matches.length > 0) {
        const firstMatch = matches[0];
        return {
          id: uuidv4(),
          severity: IssueSeverity.ERROR,
          category: 'Greenwashing',
          message: `Fossil fuel reference "${firstMatch.text}" incompatible with Green Loan classification`,
          suggestion: 'Remove natural gas/fossil fuel references or reclassify as transition finance',
          textMatch: firstMatch.text,
          startOffset: firstMatch.start,
          endOffset: firstMatch.end,
          issueType: IssueType.LMA_COMPLIANCE,
        };
      }
      return null;
    },
  },
  {
    id: 'gl-fossil-lng',
    name: 'Fossil Fuel Reference - LNG',
    category: 'Green Loan Principles',
    regulation: 'LMA GLP 2023',
    jurisdiction: 'EU',
    severity: IssueSeverity.ERROR,
    check: (content, text) => {
      const isGreenLoan = /green loan|green bond|sustainable finance|eligible green/i.test(text);
      if (!isGreenLoan) return null;
      
      const pattern = /\bLNG\b|liquefied natural gas|liquified natural gas/gi;
      const matches = findAllMatches(text, pattern);
      
      if (matches.length > 0) {
        const firstMatch = matches[0];
        return {
          id: uuidv4(),
          severity: IssueSeverity.ERROR,
          category: 'Greenwashing',
          message: `LNG infrastructure "${firstMatch.text}" not eligible for Green Loan financing`,
          suggestion: 'LNG is a fossil fuel and should be removed from eligible green projects',
          textMatch: firstMatch.text,
          startOffset: firstMatch.start,
          endOffset: firstMatch.end,
          issueType: IssueType.LMA_COMPLIANCE,
        };
      }
      return null;
    },
  },
  {
    id: 'gl-fossil-pipeline',
    name: 'Fossil Fuel Infrastructure - Pipeline',
    category: 'Green Loan Principles',
    regulation: 'LMA GLP 2023',
    jurisdiction: 'EU',
    severity: IssueSeverity.ERROR,
    check: (content, text) => {
      const isGreenLoan = /green loan|green bond|sustainable finance|eligible green/i.test(text);
      if (!isGreenLoan) return null;
      
      const pattern = /pipeline infrastructure|gas pipeline|fossil fuel infrastructure|compression facilities/gi;
      const matches = findAllMatches(text, pattern);
      
      if (matches.length > 0) {
        const firstMatch = matches[0];
        return {
          id: uuidv4(),
          severity: IssueSeverity.ERROR,
          category: 'Greenwashing',
          message: `Fossil infrastructure "${firstMatch.text}" violates Green Loan Principles`,
          suggestion: 'Pipeline and fossil fuel infrastructure must be excluded from green financing',
          textMatch: firstMatch.text,
          startOffset: firstMatch.start,
          endOffset: firstMatch.end,
          issueType: IssueType.LMA_COMPLIANCE,
        };
      }
      return null;
    },
  },
  {
    id: 'gl-general-corporate',
    name: 'General Corporate Purposes',
    category: 'Green Loan Principles',
    regulation: 'LMA GLP 2023',
    jurisdiction: 'EU',
    severity: IssueSeverity.ERROR,
    check: (content, text) => {
      const isGreenLoan = /green loan|green bond|sustainable finance|eligible green/i.test(text);
      if (!isGreenLoan) return null;
      
      const pattern = /general corporate purposes|working capital|operational expenses/gi;
      const matches = findAllMatches(text, pattern);
      
      if (matches.length > 0) {
        const firstMatch = matches[0];
        return {
          id: uuidv4(),
          severity: IssueSeverity.ERROR,
          category: 'Use of Proceeds',
          message: `"${firstMatch.text}" not permitted under Green Loan Principles`,
          suggestion: 'Green Loan proceeds must be exclusively allocated to Eligible Green Projects',
          textMatch: firstMatch.text,
          startOffset: firstMatch.start,
          endOffset: firstMatch.end,
          issueType: IssueType.LMA_COMPLIANCE,
        };
      }
      return null;
    },
  },
  {
    id: 'gl-transition-fuels',
    name: 'Transition Fuels Category',
    category: 'Green Loan Principles',
    regulation: 'LMA GLP 2023',
    jurisdiction: 'EU',
    severity: IssueSeverity.ERROR,
    check: (content, text) => {
      const isGreenLoan = /green loan|green bond|sustainable finance|eligible green/i.test(text);
      if (!isGreenLoan) return null;
      
      const pattern = /transition fuel|cleaner energy|lower-emission sources.*natural gas/gi;
      const matches = findAllMatches(text, pattern);
      
      if (matches.length > 0) {
        const firstMatch = matches[0];
        return {
          id: uuidv4(),
          severity: IssueSeverity.ERROR,
          category: 'Greenwashing',
          message: `"${firstMatch.text}" category misrepresents fossil fuels as green`,
          suggestion: 'Transition fuels require separate Transition Finance framework, not Green Loan',
          textMatch: firstMatch.text,
          startOffset: firstMatch.start,
          endOffset: firstMatch.end,
          issueType: IssueType.LMA_COMPLIANCE,
        };
      }
      return null;
    },
  },
  {
    id: 'gl-weak-language-reasonable',
    name: 'Weak Binding Language - Reasonable Efforts',
    category: 'Contract Strength',
    regulation: 'Best Practice',
    jurisdiction: 'EU',
    severity: IssueSeverity.WARNING,
    check: (content, text) => {
      const pattern = /reasonable efforts|commercially reasonable|use reasonable/gi;
      const matches = findAllMatches(text, pattern);
      
      if (matches.length > 0) {
        const firstMatch = matches[0];
        return {
          id: uuidv4(),
          severity: IssueSeverity.WARNING,
          category: 'Contract Language',
          message: `Weak binding language "${firstMatch.text}" reduces enforceability`,
          suggestion: 'Replace with mandatory "shall" or "must" for green commitments',
          textMatch: firstMatch.text,
          startOffset: firstMatch.start,
          endOffset: firstMatch.end,
          issueType: IssueType.LMA_COMPLIANCE,
        };
      }
      return null;
    },
  },
  {
    id: 'gl-weak-language-may',
    name: 'Weak Binding Language - May/Consider',
    category: 'Contract Strength',
    regulation: 'Best Practice',
    jurisdiction: 'EU',
    severity: IssueSeverity.WARNING,
    check: (content, text) => {
      const pattern = /\bmay obtain\b|\bmay consider\b|at its discretion|consider engaging/gi;
      const matches = findAllMatches(text, pattern);
      
      if (matches.length > 0) {
        const firstMatch = matches[0];
        return {
          id: uuidv4(),
          severity: IssueSeverity.WARNING,
          category: 'Contract Language',
          message: `Optional language "${firstMatch.text}" weakens green commitment`,
          suggestion: 'Make external review and verification mandatory, not optional',
          textMatch: firstMatch.text,
          startOffset: firstMatch.start,
          endOffset: firstMatch.end,
          issueType: IssueType.LMA_COMPLIANCE,
        };
      }
      return null;
    },
  },
  {
    id: 'gl-optional-review',
    name: 'Optional External Review',
    category: 'Green Loan Principles',
    regulation: 'LMA GLP 2023',
    jurisdiction: 'EU',
    severity: IssueSeverity.WARNING,
    check: (content, text) => {
      const isGreenLoan = /green loan|green bond|sustainable finance/i.test(text);
      if (!isGreenLoan) return null;
      
      const hasOptionalReview = /external review.*discretion|may obtain.*external review|optional.*verification/i.test(text);
      const hasMandatoryReview = /shall obtain.*external review|annual.*external review.*required|must.*external review/i.test(text);
      
      if (hasOptionalReview && !hasMandatoryReview) {
        const pattern = /external review.*discretion|may obtain.*external review/gi;
        const matches = findAllMatches(text, pattern);
        if (matches.length > 0) {
          const firstMatch = matches[0];
          return {
            id: uuidv4(),
            severity: IssueSeverity.WARNING,
            category: 'Verification',
            message: 'External review should be mandatory for Green Loan credibility',
            suggestion: 'Require annual external review by qualified ESG verifier (e.g., Sustainalytics)',
            textMatch: firstMatch.text,
            startOffset: firstMatch.start,
            endOffset: firstMatch.end,
            issueType: IssueType.LMA_COMPLIANCE,
          };
        }
      }
      return null;
    },
  },
  {
    id: 'gl-missing-ifc',
    name: 'Missing IFC Performance Standards',
    category: 'Environmental Standards',
    regulation: 'IFC PS',
    jurisdiction: 'EU',
    severity: IssueSeverity.WARNING,
    check: (content, text) => {
      const isGreenLoan = /green loan|green bond|sustainable finance|eligible green/i.test(text);
      if (!isGreenLoan) return null;
      
      const hasIFC = /IFC Performance Standards|IFC PS|International Finance Corporation/i.test(text);
      if (!hasIFC) {
        return {
          id: uuidv4(),
          severity: IssueSeverity.WARNING,
          category: 'Standards',
          message: 'Missing reference to IFC Performance Standards for ESMS alignment',
          suggestion: 'Add requirement for ESMS aligned with IFC Performance Standards',
          issueType: IssueType.LMA_COMPLIANCE,
        };
      }
      return null;
    },
  },
  {
    id: 'gl-missing-spo',
    name: 'Missing Second Party Opinion',
    category: 'Green Loan Principles',
    regulation: 'LMA GLP 2023',
    jurisdiction: 'EU',
    severity: IssueSeverity.INFO,
    check: (content, text) => {
      const isGreenLoan = /green loan|green bond|sustainable finance/i.test(text);
      if (!isGreenLoan) return null;
      
      const hasSPO = /second party opinion|SPO|Sustainalytics|ISS ESG|Moody.*ESG|CICERO/i.test(text);
      if (!hasSPO) {
        return {
          id: uuidv4(),
          severity: IssueSeverity.INFO,
          category: 'Verification',
          message: 'Consider obtaining Second Party Opinion for Green Loan framework',
          suggestion: 'Engage recognized SPO provider (Sustainalytics, ISS ESG, CICERO) for credibility',
          issueType: IssueType.LMA_COMPLIANCE,
        };
      }
      return null;
    },
  },
  {
    id: 'gl-missing-emissions-target',
    name: 'Missing Emission Reduction Targets',
    category: 'Environmental Impact',
    regulation: 'Best Practice',
    jurisdiction: 'EU',
    severity: IssueSeverity.INFO,
    check: (content, text) => {
      const isGreenLoan = /green loan|green bond|sustainable finance|eligible green/i.test(text);
      if (!isGreenLoan) return null;
      
      const hasTargets = /tonnes CO2|GHG emissions avoided|emission reduction|carbon reduction|\d+%.*emission/i.test(text);
      if (!hasTargets) {
        return {
          id: uuidv4(),
          severity: IssueSeverity.INFO,
          category: 'Impact Metrics',
          message: 'Document lacks specific emission reduction targets',
          suggestion: 'Add quantified GHG emissions avoided targets with clear methodology',
          issueType: IssueType.LMA_COMPLIANCE,
        };
      }
      return null;
    },
  },
  {
    id: 'gl-vague-environmental',
    name: 'Vague Environmental Language',
    category: 'Green Loan Principles',
    regulation: 'Best Practice',
    jurisdiction: 'EU',
    severity: IssueSeverity.INFO,
    check: (content, text) => {
      const isGreenLoan = /green loan|green bond|sustainable finance/i.test(text);
      if (!isGreenLoan) return null;
      
      const pattern = /environmental benefits|environmental characteristics|generally consistent|believed to be accurate/gi;
      const matches = findAllMatches(text, pattern);
      
      if (matches.length > 0) {
        const hasSpecifics = /\d+.*MW|\d+.*MWh|\d+.*tonnes|\d+.*GWh/i.test(text);
        if (!hasSpecifics) {
          const firstMatch = matches[0];
          return {
            id: uuidv4(),
            severity: IssueSeverity.INFO,
            category: 'Specificity',
            message: `Vague language "${firstMatch.text}" lacks quantifiable metrics`,
            suggestion: 'Replace with specific, measurable environmental impact metrics',
            textMatch: firstMatch.text,
            startOffset: firstMatch.start,
            endOffset: firstMatch.end,
            issueType: IssueType.LMA_COMPLIANCE,
          };
        }
      }
      return null;
    },
  },
  {
    id: 'gl-reporting-timeline',
    name: 'Extended Reporting Timeline',
    category: 'Green Loan Principles',
    regulation: 'Best Practice',
    jurisdiction: 'EU',
    severity: IssueSeverity.WARNING,
    check: (content, text) => {
      const pattern = /within 150 days|within 180 days|within 6 months/gi;
      const matches = findAllMatches(text, pattern);
      
      if (matches.length > 0) {
        const firstMatch = matches[0];
        return {
          id: uuidv4(),
          severity: IssueSeverity.WARNING,
          category: 'Reporting',
          message: `Extended reporting timeline "${firstMatch.text}" delays transparency`,
          suggestion: 'Reduce to 120 days for timely green loan reporting',
          textMatch: firstMatch.text,
          startOffset: firstMatch.start,
          endOffset: firstMatch.end,
          issueType: IssueType.LMA_COMPLIANCE,
        };
      }
      return null;
    },
  },
  {
    id: 'gl-coal-reference',
    name: 'Coal Reference in Green Context',
    category: 'Green Loan Principles',
    regulation: 'LMA GLP 2023',
    jurisdiction: 'EU',
    severity: IssueSeverity.ERROR,
    check: (content, text) => {
      const isGreenLoan = /green loan|green bond|sustainable finance|eligible green/i.test(text);
      if (!isGreenLoan) return null;
      
      const pattern = /coal generation|coal-fired|coal facility|coal plant/gi;
      const matches = findAllMatches(text, pattern);
      
      if (matches.length > 0) {
        const firstMatch = matches[0];
        return {
          id: uuidv4(),
          severity: IssueSeverity.ERROR,
          category: 'Greenwashing',
          message: `Coal reference "${firstMatch.text}" absolutely incompatible with Green Loan`,
          suggestion: 'All coal references must be removed from Green Loan documentation',
          textMatch: firstMatch.text,
          startOffset: firstMatch.start,
          endOffset: firstMatch.end,
          issueType: IssueType.LMA_COMPLIANCE,
        };
      }
      return null;
    },
  },
];

interface DisparityPattern {
  pattern: RegExp;
  category: string;
  severity: IssueSeverity;
  message: string;
  suggestion: string;
  favoredParty: 'lender' | 'borrower' | 'neutral';
}

const DISPARITY_PATTERNS: DisparityPattern[] = [
  {
    pattern: /as determined by the Lender|at the Lender's discretion|in the Lender's sole discretion/gi,
    category: 'Unilateral Discretion',
    severity: IssueSeverity.WARNING,
    message: 'Unilateral lender discretion clause',
    suggestion: 'Replace with objective criteria or mutual agreement requirement',
    favoredParty: 'lender',
  },
  {
    pattern: /as determined by the Borrower|at the Borrower's discretion|in the Borrower's sole discretion/gi,
    category: 'Unilateral Discretion',
    severity: IssueSeverity.WARNING,
    message: 'Unilateral borrower discretion clause',
    suggestion: 'Consider whether this discretion is appropriate for green loan obligations',
    favoredParty: 'borrower',
  },
  {
    pattern: /subject to review and acceptance by the Lender/gi,
    category: 'Unilateral Discretion',
    severity: IssueSeverity.WARNING,
    message: 'Margin adjustment subject to lender acceptance',
    suggestion: 'Margin adjustments should be automatic upon meeting objective criteria',
    favoredParty: 'lender',
  },
  {
    pattern: /may obtain.*external review|external review.*at its discretion/gi,
    category: 'Optional Obligation',
    severity: IssueSeverity.WARNING,
    message: 'External review is optional instead of mandatory',
    suggestion: 'Green Loan best practice requires mandatory annual external review',
    favoredParty: 'borrower',
  },
  {
    pattern: /consult in good faith regarding remediation/gi,
    category: 'Weak Remedy',
    severity: IssueSeverity.ERROR,
    message: 'Weak remedy for breach - only requires good faith consultation',
    suggestion: 'Misapplication of proceeds should constitute an Event of Default',
    favoredParty: 'borrower',
  },
  {
    pattern: /material changes.*as determined by the Lender/gi,
    category: 'Unilateral Discretion',
    severity: IssueSeverity.WARNING,
    message: 'Mandatory prepayment triggered at lender\'s sole discretion',
    suggestion: 'Define objective criteria for what constitutes material changes',
    favoredParty: 'lender',
  },
  {
    pattern: /more than 15%.*without.*consent/gi,
    category: 'Threshold Disparity',
    severity: IssueSeverity.INFO,
    message: 'Asset disposal threshold set at 15% (higher than standard 10%)',
    suggestion: 'Consider reducing threshold to 10% with replacement requirement',
    favoredParty: 'borrower',
  },
  {
    pattern: /Lender may assign.*without.*maintaining green/gi,
    category: 'Missing Protection',
    severity: IssueSeverity.INFO,
    message: 'Lender can assign without committing to maintain green terms',
    suggestion: 'Require assignee to maintain green loan terms and commitments',
    favoredParty: 'lender',
  },
  {
    pattern: /up to 10%.*may be used for general corporate/gi,
    category: 'Use of Proceeds',
    severity: IssueSeverity.ERROR,
    message: 'Allows portion of proceeds for non-green corporate purposes',
    suggestion: 'Green Loan proceeds must be 100% allocated to Eligible Green Projects',
    favoredParty: 'borrower',
  },
  {
    pattern: /endeavou?r to ensure|use reasonable efforts to ensure/gi,
    category: 'Weak Obligation',
    severity: IssueSeverity.WARNING,
    message: 'Weak obligation language - "endeavour" instead of "shall"',
    suggestion: 'Replace with mandatory "shall ensure" for key green obligations',
    favoredParty: 'borrower',
  },
  {
    pattern: /to the extent reasonably available|to the extent practicable/gi,
    category: 'Weak Obligation',
    severity: IssueSeverity.INFO,
    message: 'Conditional reporting weakens transparency requirements',
    suggestion: 'Require specific metrics with defined reporting standards',
    favoredParty: 'borrower',
  },
  {
    pattern: /may be increased by up to.*bps.*subject to Lender/gi,
    category: 'Asymmetric Mechanism',
    severity: IssueSeverity.INFO,
    message: 'Margin increase mechanism favors lender discretion',
    suggestion: 'Ensure symmetric and automatic margin adjustment in both directions',
    favoredParty: 'lender',
  },
  {
    pattern: /no specific green obligations as Events of Default/gi,
    category: 'Missing Protection',
    severity: IssueSeverity.WARNING,
    message: 'Missing specific green breach Events of Default',
    suggestion: 'Add enumerated green obligation breaches as specific Events of Default',
    favoredParty: 'borrower',
  },
  {
    pattern: /consider reallocating|may reallocate/gi,
    category: 'Optional Obligation',
    severity: IssueSeverity.INFO,
    message: 'Reallocation of proceeds is optional instead of mandatory',
    suggestion: 'Require mandatory reallocation if projects become ineligible',
    favoredParty: 'borrower',
  },
];

export interface AnalyzeOptions {
  providerCountry?: EUCountry;
  getterCountry?: EUCountry;
}

import { AIComplianceService } from './ai-compliance.service';

@Injectable()
export class ComplianceService {
  constructor(
    @InjectRepository(ComplianceReport)
    private complianceReportRepository: Repository<ComplianceReport>,
    private documentsService: DocumentsService,
    private aiComplianceService: AIComplianceService,
  ) {}

  async analyzeDocument(documentId: string, userId: string, options?: AnalyzeOptions): Promise<ComplianceReport> {
    const document = await this.documentsService.findOne(documentId, userId);
    const extractedText = this.extractText(document.content);
    
    const issues: ComplianceIssue[] = [];
    const applicableRules = this.getApplicableRules(options);
    
    for (const rule of applicableRules) {
      const issue = rule.check(document.content, extractedText);
      if (issue) {
        issues.push({
          ...issue,
          regulation: rule.regulation,
          jurisdiction: typeof rule.jurisdiction === 'string' && rule.jurisdiction !== 'EU' 
            ? EU_COUNTRY_NAMES[rule.jurisdiction as EUCountry] 
            : 'EU-wide',
        });
      }
    }

    const score = this.calculateScore(issues);

    const report = this.complianceReportRepository.create({
      documentId,
      score,
      issues,
    });

    return this.complianceReportRepository.save(report);
  }

  private getApplicableRules(options?: AnalyzeOptions): ComplianceRule[] {
    const allRules = [...EU_COMPLIANCE_RULES, ...GREEN_LOAN_RULES];
    const euWideRules = allRules.filter(r => r.jurisdiction === 'EU');
    
    if (!options?.providerCountry && !options?.getterCountry) {
      return euWideRules;
    }

    const countrySpecificRules = allRules.filter(r => {
      if (r.jurisdiction === 'EU') return false;
      return r.jurisdiction === options.providerCountry || r.jurisdiction === options.getterCountry;
    });

    return [...euWideRules, ...countrySpecificRules];
  }

  async getReports(documentId: string): Promise<ComplianceReport[]> {
    return this.complianceReportRepository.find({
      where: { documentId },
      order: { analyzedAt: 'DESC' },
    });
  }

  async getLatestReport(documentId: string): Promise<ComplianceReport | null> {
    return this.complianceReportRepository.findOne({
      where: { documentId },
      order: { analyzedAt: 'DESC' },
    });
  }

  getRules() {
    const allRules = [...EU_COMPLIANCE_RULES, ...GREEN_LOAN_RULES];
    return allRules.map(rule => ({
      id: rule.id,
      name: rule.name,
      category: rule.category,
      regulation: rule.regulation,
      jurisdiction: rule.jurisdiction,
      severity: rule.severity,
    }));
  }

  async analyzeWithHighlights(documentId: string, userId: string, options?: AnalyzeOptions): Promise<ComplianceReport> {
    const document = await this.documentsService.findOne(documentId, userId);
    const extractedText = this.extractText(document.content);
    
    const issues: ComplianceIssue[] = [];
    const applicableRules = this.getApplicableRules(options);
    
    for (const rule of applicableRules) {
      const issue = rule.check(document.content, extractedText);
      if (issue) {
        issues.push({
          ...issue,
          regulation: rule.regulation,
          jurisdiction: typeof rule.jurisdiction === 'string' && rule.jurisdiction !== 'EU' 
            ? EU_COUNTRY_NAMES[rule.jurisdiction as EUCountry] 
            : 'EU-wide',
        });
      }
    }

    const lmaIssues = this.findAllHighlightableIssues(extractedText);
    issues.push(...lmaIssues);

    const disparityIssues = this.findDisparityIssues(extractedText);
    issues.push(...disparityIssues);

    if (this.aiComplianceService.isAvailable()) {
      try {
        const aiResult = await this.aiComplianceService.analyzeGreenLoanCompliance(extractedText);
        const existingTexts = new Set(issues.map(i => i.textMatch).filter(Boolean));
        for (const aiIssue of aiResult.issues) {
          if (!aiIssue.textMatch || !existingTexts.has(aiIssue.textMatch)) {
            issues.push({
              ...aiIssue,
              issueType: IssueType.LMA_COMPLIANCE,
            });
            if (aiIssue.textMatch) {
              existingTexts.add(aiIssue.textMatch);
            }
          }
        }
      } catch (error) {
        console.error('AI analysis failed, using rule-based results only:', error);
      }
    }

    const score = this.calculateScore(issues);

    const report = this.complianceReportRepository.create({
      documentId,
      score,
      issues,
    });

    return this.complianceReportRepository.save(report);
  }

  private findDisparityIssues(text: string): ComplianceIssue[] {
    const issues: ComplianceIssue[] = [];
    const existingMatches = new Set<string>();

    for (const disparityPattern of DISPARITY_PATTERNS) {
      const matches = findAllMatches(text, disparityPattern.pattern);
      for (const match of matches.slice(0, 3)) {
        const matchKey = `${match.text.toLowerCase()}-${match.start}`;
        if (existingMatches.has(matchKey)) continue;
        existingMatches.add(matchKey);

        issues.push({
          id: uuidv4(),
          severity: disparityPattern.severity,
          category: disparityPattern.category,
          message: `${disparityPattern.message}: "${match.text}"`,
          suggestion: disparityPattern.suggestion,
          textMatch: match.text,
          startOffset: match.start,
          endOffset: match.end,
          issueType: IssueType.FAIRNESS,
          favoredParty: disparityPattern.favoredParty,
        });
      }
    }

    return issues;
  }

  private findAllHighlightableIssues(text: string): ComplianceIssue[] {
    const issues: ComplianceIssue[] = [];
    const isGreenLoan = /green loan|green bond|sustainable finance|eligible green/i.test(text);
    if (!isGreenLoan) return issues;

    const criticalPatterns = [
      { pattern: /natural gas|NGCC|combined cycle|gas-fired|gas turbine/gi, category: 'Fossil Fuel', message: 'Fossil fuel reference incompatible with Green Loan' },
      { pattern: /\bLNG\b|liquefied natural gas/gi, category: 'Fossil Fuel', message: 'LNG infrastructure not eligible for Green Loan' },
      { pattern: /pipeline infrastructure|gas pipeline|compression facilities/gi, category: 'Fossil Fuel', message: 'Fossil infrastructure violates Green Loan Principles' },
      { pattern: /general corporate purposes|working capital/gi, category: 'Use of Proceeds', message: 'Not permitted under Green Loan Principles' },
      { pattern: /coal generation|coal-fired|coal facility/gi, category: 'Fossil Fuel', message: 'Coal absolutely incompatible with Green Loan' },
    ];

    const warningPatterns = [
      { pattern: /reasonable efforts|commercially reasonable/gi, category: 'Weak Language', message: 'Weak binding language reduces enforceability' },
      { pattern: /\bmay obtain\b|\bmay consider\b/gi, category: 'Weak Language', message: 'Optional language weakens green commitment' },
      { pattern: /within 150 days|within 180 days/gi, category: 'Reporting', message: 'Extended reporting timeline delays transparency' },
    ];

    const infoPatterns = [
      { pattern: /believed to be accurate|generally consistent/gi, category: 'Vague Language', message: 'Vague language lacks quantifiable metrics' },
    ];

    for (const { pattern, category, message } of criticalPatterns) {
      const matches = findAllMatches(text, pattern);
      for (const match of matches.slice(0, 5)) {
        issues.push({
          id: uuidv4(),
          severity: IssueSeverity.ERROR,
          category,
          message: `${message}: "${match.text}"`,
          textMatch: match.text,
          startOffset: match.start,
          endOffset: match.end,
          issueType: IssueType.LMA_COMPLIANCE,
        });
      }
    }

    for (const { pattern, category, message } of warningPatterns) {
      const matches = findAllMatches(text, pattern);
      for (const match of matches.slice(0, 5)) {
        issues.push({
          id: uuidv4(),
          severity: IssueSeverity.WARNING,
          category,
          message: `${message}: "${match.text}"`,
          textMatch: match.text,
          startOffset: match.start,
          endOffset: match.end,
          issueType: IssueType.LMA_COMPLIANCE,
        });
      }
    }

    for (const { pattern, category, message } of infoPatterns) {
      const matches = findAllMatches(text, pattern);
      for (const match of matches.slice(0, 3)) {
        issues.push({
          id: uuidv4(),
          severity: IssueSeverity.INFO,
          category,
          message: `${message}: "${match.text}"`,
          textMatch: match.text,
          startOffset: match.start,
          endOffset: match.end,
          issueType: IssueType.LMA_COMPLIANCE,
        });
      }
    }

    return issues;
  }

  getEUCountries() {
    return Object.entries(EU_COUNTRY_NAMES).map(([code, name]) => ({
      code,
      name,
    }));
  }

  private extractText(content: any): string {
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (content.text) return content.text;
    
    const textParts: string[] = [];
    
    const extractNode = (node: any) => {
      if (node.type === 'text' && node.text) {
        textParts.push(node.text);
      } else if (node.content && Array.isArray(node.content)) {
        const isBlock = ['paragraph', 'heading', 'listItem', 'bulletList', 'orderedList', 'blockquote', 'horizontalRule', 'table', 'tableRow', 'tableCell'].includes(node.type);
        if (isBlock && textParts.length > 0 && textParts[textParts.length - 1] !== ' ') {
          textParts.push(' ');
        }
        node.content.forEach(extractNode);
        if (isBlock && textParts.length > 0 && textParts[textParts.length - 1] !== ' ') {
          textParts.push(' ');
        }
      }
      if (node.type === 'hardBreak') {
        textParts.push(' ');
      }
    };
    
    if (Array.isArray(content)) {
      content.forEach(extractNode);
    } else if (content.content) {
      if (Array.isArray(content.content)) {
        content.content.forEach(extractNode);
      } else {
        extractNode(content.content);
      }
    }
    
    return textParts.join('').replace(/\s+/g, ' ').trim();
  }

  private calculateScore(issues: ComplianceIssue[]): number {
    if (issues.length === 0) return 100;

    let deductions = 0;
    for (const issue of issues) {
      switch (issue.severity) {
        case IssueSeverity.ERROR:
          deductions += 15;
          break;
        case IssueSeverity.WARNING:
          deductions += 8;
          break;
        case IssueSeverity.INFO:
          deductions += 3;
          break;
      }
    }

    return Math.max(0, 100 - deductions);
  }
}
