import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SignatureRequest, SignatureStatus } from '../../database/entities/signature-request.entity';
import { DocumentsService } from '../documents/documents.service';

export interface Signer {
  email: string;
  name: string;
  order: number;
}

export interface EnvelopeResult {
  envelopeId: string;
  status: string;
  signingUrl?: string;
}

@Injectable()
export class DocusignService {
  private integrationKey: string;
  private secretKey: string;
  private accountId: string;
  private basePath: string;
  private oauthBasePath: string;

  constructor(
    private configService: ConfigService,
    @InjectRepository(SignatureRequest)
    private signatureRequestRepository: Repository<SignatureRequest>,
    private documentsService: DocumentsService,
  ) {
    this.integrationKey = this.configService.get('DOCUSIGN_INTEGRATION_KEY', '');
    this.secretKey = this.configService.get('DOCUSIGN_SECRET_KEY', '');
    this.accountId = this.configService.get('DOCUSIGN_ACCOUNT_ID', '');
    this.basePath = this.configService.get('DOCUSIGN_BASE_PATH', 'https://demo.docusign.net/restapi');
    this.oauthBasePath = this.configService.get('DOCUSIGN_OAUTH_BASE_PATH', 'https://account-d.docusign.com');
  }

  getAuthorizationUrl(redirectUri: string, state: string) {
    const scopes = 'signature impersonation';
    return `${this.oauthBasePath}/oauth/auth?response_type=code&scope=${encodeURIComponent(scopes)}&client_id=${this.integrationKey}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  }

  async exchangeCodeForToken(code: string, redirectUri: string) {
    const credentials = Buffer.from(`${this.integrationKey}:${this.secretKey}`).toString('base64');
    
    const response = await fetch(`${this.oauthBasePath}/oauth/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    return response.json();
  }

  async createEnvelope(
    documentId: string,
    userId: string,
    signers: Signer[],
    accessToken: string,
  ): Promise<EnvelopeResult> {
    const document = await this.documentsService.findOne(documentId, userId);
    
    const documentBase64 = Buffer.from(JSON.stringify(document.content)).toString('base64');

    const envelopeDefinition = {
      emailSubject: `Please sign: ${document.title}`,
      documents: [{
        documentBase64,
        name: document.title,
        fileExtension: 'html',
        documentId: '1',
      }],
      recipients: {
        signers: signers.map((signer, index) => ({
          email: signer.email,
          name: signer.name,
          recipientId: String(index + 1),
          routingOrder: String(signer.order),
          tabs: {
            signHereTabs: [{
              documentId: '1',
              pageNumber: '1',
              xPosition: '100',
              yPosition: '700',
            }],
          },
        })),
      },
      status: 'sent',
    };

    const response = await fetch(
      `${this.basePath}/v2.1/accounts/${this.accountId}/envelopes`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(envelopeDefinition),
      },
    );

    const result = await response.json();

    const signatureRequest = this.signatureRequestRepository.create({
      documentId,
      envelopeId: result.envelopeId,
      status: SignatureStatus.SENT,
      signers: signers.map(s => ({ ...s, status: 'pending' })),
    });

    await this.signatureRequestRepository.save(signatureRequest);

    return {
      envelopeId: result.envelopeId,
      status: result.status,
    };
  }

  async getSigningUrl(
    envelopeId: string,
    signerEmail: string,
    signerName: string,
    returnUrl: string,
    accessToken: string,
  ): Promise<string> {
    const response = await fetch(
      `${this.basePath}/v2.1/accounts/${this.accountId}/envelopes/${envelopeId}/views/recipient`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: signerEmail,
          userName: signerName,
          returnUrl,
          authenticationMethod: 'email',
        }),
      },
    );

    const result = await response.json();
    return result.url;
  }

  async getEnvelopeStatus(envelopeId: string, accessToken: string) {
    const response = await fetch(
      `${this.basePath}/v2.1/accounts/${this.accountId}/envelopes/${envelopeId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      },
    );

    return response.json();
  }

  async handleWebhook(payload: any) {
    const envelopeId = payload.envelopeId;
    const status = payload.status;

    const signatureRequest = await this.signatureRequestRepository.findOne({
      where: { envelopeId },
    });

    if (signatureRequest) {
      signatureRequest.status = this.mapDocusignStatus(status);
      if (status === 'completed') {
        signatureRequest.completedAt = new Date();
      }
      await this.signatureRequestRepository.save(signatureRequest);
    }

    return { received: true };
  }

  async getSignatureRequests(documentId: string) {
    return this.signatureRequestRepository.find({
      where: { documentId },
      order: { createdAt: 'DESC' },
    });
  }

  async downloadSignedDocument(envelopeId: string, accessToken: string): Promise<Buffer> {
    const response = await fetch(
      `${this.basePath}/v2.1/accounts/${this.accountId}/envelopes/${envelopeId}/documents/combined`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      },
    );

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private mapDocusignStatus(docusignStatus: string): SignatureStatus {
    const statusMap: Record<string, SignatureStatus> = {
      'sent': SignatureStatus.SENT,
      'delivered': SignatureStatus.DELIVERED,
      'signed': SignatureStatus.SIGNED,
      'completed': SignatureStatus.COMPLETED,
      'declined': SignatureStatus.DECLINED,
      'voided': SignatureStatus.VOIDED,
    };
    return statusMap[docusignStatus] || SignatureStatus.PENDING;
  }
}
