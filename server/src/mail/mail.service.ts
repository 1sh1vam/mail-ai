import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, gmail_v1 } from 'googleapis';
import { AuthService } from '../auth/auth.service';

export interface Email {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  body: string;
  date: string;
  isRead: boolean;
  labels: string[];
}

export interface SendEmailDto {
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
}

export interface EmailFilter {
  query?: string;
  sender?: string;
  dateFrom?: string;
  dateTo?: string;
  isUnread?: boolean;
  maxResults?: number;
  pageToken?: string;
}

export interface PaginatedResponse {
  emails: Email[];
  pagination: {
    currentPage: number;
    totalPages: number;
    pageSize: number;
    totalEmails: number;
  };
  nextPageToken?: string;
}

// Cache for page tokens per user/query combination
const pageTokenCache = new Map<string, Map<number, string>>();

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {}

  private async getGmailClient(email: string): Promise<gmail_v1.Gmail> {
    const tokens = await this.authService.getGoogleTokens(email);
    
    if (!tokens) {
      throw new Error('No tokens found for user');
    }

    if (!tokens.refreshToken) {
      this.logger.warn(`No refresh token for ${email}. User needs to re-login.`);
    }

    const oauth2Client = new google.auth.OAuth2(
      this.configService.get('google.clientId'),
      this.configService.get('google.clientSecret'),
    );

    oauth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });

    // Safety net: handle automatic token refresh events from googleapis
    oauth2Client.on('tokens', async (newTokens) => {
      this.logger.log(`[Token Refresh] Auto-refresh event for ${email}`);
      if (newTokens.access_token) {
        const expiresAt = newTokens.expiry_date
          ? new Date(newTokens.expiry_date)
          : new Date(Date.now() + 3600 * 1000);
        await this.authService.updateGoogleTokens(
          email,
          newTokens.access_token,
          newTokens.refresh_token ?? undefined,
          expiresAt,
        );
      }
    });

    // Smart refresh: only refresh if token is expired or within 5-min buffer
    const BUFFER_MS = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();
    const expiresAt = tokens.googleTokenExpiresAt
      ? new Date(tokens.googleTokenExpiresAt).getTime()
      : 0; // If no expiry tracked, force a refresh

    if (tokens.refreshToken && (expiresAt === 0 || now >= expiresAt - BUFFER_MS)) {
      try {
        this.logger.log(`[Token Refresh] Refreshing for ${email} (expired or near expiry)`);
        const { credentials } = await oauth2Client.refreshAccessToken();
        
        oauth2Client.setCredentials(credentials);
        
        if (credentials.access_token) {
          const newExpiresAt = credentials.expiry_date
            ? new Date(credentials.expiry_date)
            : new Date(Date.now() + 3600 * 1000);
          await this.authService.updateGoogleTokens(
            email,
            credentials.access_token,
            credentials.refresh_token ?? undefined,
            newExpiresAt,
          );
        }
      } catch (error: any) {
        this.logger.error(`[Token Refresh] FAILED for ${email}: ${error.message}`);
        throw new Error(`Token refresh failed: ${error.message}. User needs to re-login.`);
      }
    }

    return google.gmail({ version: 'v1', auth: oauth2Client });
  }

  private parseEmailHeaders(headers: gmail_v1.Schema$MessagePartHeader[]): {
    from: string;
    to: string;
    subject: string;
    date: string;
  } {
    const getHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

    return {
      from: getHeader('from'),
      to: getHeader('to'),
      subject: getHeader('subject'),
      date: getHeader('date'),
    };
  }

  private decodeBase64(data: string): string {
    return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
  }

  private getEmailBody(payload: gmail_v1.Schema$MessagePart): string {
    if (payload.body?.data) {
      return this.decodeBase64(payload.body.data);
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return this.decodeBase64(part.body.data);
        }
        if (part.mimeType === 'text/html' && part.body?.data) {
          return this.decodeBase64(part.body.data);
        }
        if (part.parts) {
          const nestedBody = this.getEmailBody(part);
          if (nestedBody) return nestedBody;
        }
      }
    }

    return '';
  }

  private getCacheKey(userEmail: string, filter: EmailFilter, type: 'inbox' | 'sent'): string {
    return `${userEmail}:${type}:${JSON.stringify(filter)}`;
  }

  private buildQueryString(filter: EmailFilter): string {
    const queryParts: string[] = [];
    if (filter.query) queryParts.push(filter.query);
    if (filter.sender) queryParts.push(`from:${filter.sender}`);
    if (filter.dateFrom) queryParts.push(`after:${filter.dateFrom}`);
    if (filter.dateTo) queryParts.push(`before:${filter.dateTo}`);
    if (filter.isUnread) queryParts.push('is:unread');
    return queryParts.join(' ');
  }

  async getEmailsWithPagination(
    userEmail: string,
    filter: EmailFilter = {},
    page: number = 1,
  ): Promise<PaginatedResponse> {
    this.logger.log(`[Pagination] Fetching page ${page} for ${userEmail}`);
    
    const gmail = await this.getGmailClient(userEmail);
    const pageSize = filter.maxResults || 20;

    // Simple approach: fetch pages sequentially until we reach the requested page
    let pageToken: string | undefined;
    let response: gmail_v1.Schema$ListMessagesResponse | undefined;
    
    for (let p = 1; p <= page; p++) {
      this.logger.log(`[Pagination] Fetching page ${p}/${page}, token: ${pageToken ? 'present' : 'none'}`);
      
      response = (await gmail.users.messages.list({
        userId: 'me',
        q: this.buildQueryString(filter) || undefined,
        maxResults: pageSize,
        pageToken: pageToken || undefined,
        labelIds: ['INBOX'],
      })).data;
      
      if (p < page) {
        if (!response.nextPageToken) {
          // No more pages available
          this.logger.log(`[Pagination] No more pages after ${p}`);
          return {
            emails: [],
            pagination: {
              currentPage: page,
              totalPages: p,
              pageSize,
              totalEmails: p * pageSize,
            },
          };
        }
        pageToken = response.nextPageToken;
      }
    }

    const messages = response?.messages || [];
    this.logger.log(`[Pagination] Got ${messages.length} messages for page ${page}`);
    
    // Fetch all emails in parallel
    const emailPromises = messages.map(async (msg) => {
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Subject', 'Date'],
      });

      const headers = this.parseEmailHeaders(fullMessage.data.payload?.headers || []);

      return {
        id: fullMessage.data.id!,
        threadId: fullMessage.data.threadId!,
        from: headers.from,
        to: headers.to,
        subject: headers.subject,
        snippet: fullMessage.data.snippet || '',
        body: '',
        date: headers.date,
        isRead: !fullMessage.data.labelIds?.includes('UNREAD'),
        labels: fullMessage.data.labelIds || [],
      };
    });

    const emails = await Promise.all(emailPromises);

    // Estimate total pages
    const hasMore = !!response?.nextPageToken;
    const estimatedTotalPages = hasMore ? page + 1 : page;

    return {
      emails,
      pagination: {
        currentPage: page,
        totalPages: estimatedTotalPages,
        pageSize,
        totalEmails: page * pageSize + (hasMore ? pageSize : 0),
      },
      nextPageToken: response?.nextPageToken || undefined,
    };
  }

  async getSentEmailsWithPagination(
    userEmail: string,
    pageSize: number = 20,
    page: number = 1,
    pageToken?: string,
  ): Promise<PaginatedResponse> {
    const gmail = await this.getGmailClient(userEmail);
    const cacheKey = `${userEmail}:sent:${pageSize}`;

    // Get or create cache
    if (!pageTokenCache.has(cacheKey)) {
      pageTokenCache.set(cacheKey, new Map([[1, '']]));
    }
    const tokenCache = pageTokenCache.get(cacheKey)!;

    // Find the highest cached page <= requested page
    let currentPage = 1;
    let currentToken: string | undefined = pageToken;

    if (!pageToken) {
      for (let p = page; p >= 1; p--) {
        if (tokenCache.has(p)) {
          currentPage = p;
          const cachedToken = tokenCache.get(p);
          currentToken = cachedToken || undefined;
          break;
        }
      }
    }

    // Fetch pages until we reach the requested page
    let response: gmail_v1.Schema$ListMessagesResponse | null = null;
    
    while (currentPage <= page) {
      response = (await gmail.users.messages.list({
        userId: 'me',
        maxResults: pageSize,
        pageToken: currentToken || undefined,
        labelIds: ['SENT'],
      })).data;

      if (response.nextPageToken) {
        tokenCache.set(currentPage + 1, response.nextPageToken);
      }

      if (currentPage < page) {
        currentToken = response.nextPageToken || undefined;
        currentPage++;
        
        if (!response.nextPageToken) {
          return {
            emails: [],
            pagination: {
              currentPage: page,
              totalPages: currentPage,
              pageSize,
              totalEmails: 0,
            },
          };
        }
      } else {
        break;
      }
    }

    const messages = response?.messages || [];

    // Fetch all emails in parallel
    const emailPromises = messages.map(async (msg) => {
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Subject', 'Date'],
      });

      const headers = this.parseEmailHeaders(fullMessage.data.payload?.headers || []);

      return {
        id: fullMessage.data.id!,
        threadId: fullMessage.data.threadId!,
        from: headers.from,
        to: headers.to,
        subject: headers.subject,
        snippet: fullMessage.data.snippet || '',
        body: '',
        date: headers.date,
        isRead: true,
        labels: fullMessage.data.labelIds || [],
      };
    });

    const emails = await Promise.all(emailPromises);

    const hasMore = !!response?.nextPageToken;
    const estimatedTotalPages = hasMore ? page + 1 : page;

    return {
      emails,
      pagination: {
        currentPage: page,
        totalPages: estimatedTotalPages,
        pageSize,
        totalEmails: page * pageSize + (hasMore ? pageSize : 0),
      },
      nextPageToken: response?.nextPageToken || undefined,
    };
  }

  // Legacy methods for backwards compatibility
  async getEmails(
    userEmail: string,
    filter: EmailFilter = {},
  ): Promise<{ emails: Email[]; nextPageToken?: string }> {
    const result = await this.getEmailsWithPagination(userEmail, filter, 1);
    return {
      emails: result.emails,
      nextPageToken: result.nextPageToken,
    };
  }

  async getSentEmails(
    userEmail: string,
    maxResults = 20,
    pageToken?: string,
  ): Promise<{ emails: Email[]; nextPageToken?: string }> {
    const gmail = await this.getGmailClient(userEmail);

    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      pageToken,
      labelIds: ['SENT'],
    });

    const messages = response.data.messages || [];

    const emailPromises = messages.map(async (msg) => {
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id!,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Subject', 'Date'],
      });

      const headers = this.parseEmailHeaders(fullMessage.data.payload?.headers || []);

      return {
        id: fullMessage.data.id!,
        threadId: fullMessage.data.threadId!,
        from: headers.from,
        to: headers.to,
        subject: headers.subject,
        snippet: fullMessage.data.snippet || '',
        body: '',
        date: headers.date,
        isRead: true,
        labels: fullMessage.data.labelIds || [],
      };
    });

    const emails = await Promise.all(emailPromises);

    return {
      emails,
      nextPageToken: response.data.nextPageToken || undefined,
    };
  }

  async getEmail(userEmail: string, emailId: string): Promise<Email> {
    const gmail = await this.getGmailClient(userEmail);

    const response = await gmail.users.messages.get({
      userId: 'me',
      id: emailId,
      format: 'full',
    });

    const headers = this.parseEmailHeaders(response.data.payload?.headers || []);
    const body = this.getEmailBody(response.data.payload!);

    return {
      id: response.data.id!,
      threadId: response.data.threadId!,
      from: headers.from,
      to: headers.to,
      subject: headers.subject,
      snippet: response.data.snippet || '',
      body,
      date: headers.date,
      isRead: !response.data.labelIds?.includes('UNREAD'),
      labels: response.data.labelIds || [],
    };
  }

  async sendEmail(userEmail: string, dto: SendEmailDto): Promise<Email> {
    const gmail = await this.getGmailClient(userEmail);

    const messageParts = [
      `To: ${dto.to}`,
      `Subject: ${dto.subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      dto.body,
    ];

    if (dto.inReplyTo) {
      messageParts.unshift(`In-Reply-To: ${dto.inReplyTo}`);
      messageParts.unshift(`References: ${dto.inReplyTo}`);
    }

    const message = messageParts.join('\n');
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    return this.getEmail(userEmail, response.data.id!);
  }

  async markAsRead(userEmail: string, emailId: string): Promise<void> {
    const gmail = await this.getGmailClient(userEmail);

    await gmail.users.messages.modify({
      userId: 'me',
      id: emailId,
      requestBody: {
        removeLabelIds: ['UNREAD'],
      },
    });
  }

  async searchEmails(userEmail: string, query: string, maxResults = 20): Promise<Email[]> {
    const result = await this.getEmails(userEmail, { query, maxResults });
    return result.emails;
  }

  async setupWatch(userEmail: string): Promise<{ historyId: string; expiration: string }> {
    const gmail = await this.getGmailClient(userEmail);
    const projectId = this.configService.get('gcp.projectId');
    const topic = this.configService.get('gcp.pubsubTopic');

    const response = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName: `projects/${projectId}/topics/${topic}`,
        labelIds: ['INBOX'],
      },
    });

    return {
      historyId: response.data.historyId!,
      expiration: response.data.expiration!,
    };
  }

  async getHistoryChanges(
    userEmail: string,
    startHistoryId: string,
  ): Promise<{ newMessages: string[]; historyId: string }> {
    const gmail = await this.getGmailClient(userEmail);

    const response = await gmail.users.history.list({
      userId: 'me',
      startHistoryId,
      historyTypes: ['messageAdded'],
    });

    const newMessages: string[] = [];
    for (const history of response.data.history || []) {
      for (const added of history.messagesAdded || []) {
        if (added.message?.id) {
          newMessages.push(added.message.id);
        }
      }
    }

    return {
      newMessages,
      historyId: response.data.historyId || startHistoryId,
    };
  }
}
