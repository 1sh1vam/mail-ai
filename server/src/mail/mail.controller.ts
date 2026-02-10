import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { MailService } from './mail.service';
import type { SendEmailDto, EmailFilter } from './mail.service';
import { OAuthGuard } from '../auth/guards/oauth.guard';

interface AuthenticatedUser {
  email: string;
  name: string;
  picture: string;
}

@Controller('mail')
@UseGuards(OAuthGuard)
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get('inbox')
  async getInbox(
    @Req() req: Request,
    @Query('query') query?: string,
    @Query('sender') sender?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('unread') unread?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('pageToken') pageToken?: string,
  ) {
    const user = req.user as AuthenticatedUser;
    const filter: EmailFilter = {
      query,
      sender,
      dateFrom,
      dateTo,
      isUnread: unread === 'true',
      maxResults: pageSize ? parseInt(pageSize, 10) : 20,
      pageToken,
    };

    const pageNum = page ? parseInt(page, 10) : 1;
    return this.mailService.getEmailsWithPagination(user.email, filter, pageNum);
  }

  @Get('sent')
  async getSent(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('pageToken') pageToken?: string,
  ) {
    const user = req.user as AuthenticatedUser;
    const pageNum = page ? parseInt(page, 10) : 1;
    const size = pageSize ? parseInt(pageSize, 10) : 20;
    
    return this.mailService.getSentEmailsWithPagination(
      user.email,
      size,
      pageNum,
      pageToken,
    );
  }

  @Get('search')
  async search(
    @Req() req: Request,
    @Query('q') query: string,
    @Query('maxResults') maxResults?: string,
  ) {
    const user = req.user as AuthenticatedUser;
    const emails = await this.mailService.searchEmails(
      user.email,
      query,
      maxResults ? parseInt(maxResults, 10) : 20,
    );
    return { emails };
  }

  @Get(':id')
  async getEmail(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as AuthenticatedUser;
    const email = await this.mailService.getEmail(user.email, id);
    
    // Mark as read when opened
    await this.mailService.markAsRead(user.email, id);
    
    return email;
  }

  @Post('send')
  async sendEmail(@Req() req: Request, @Body() dto: SendEmailDto) {
    const user = req.user as AuthenticatedUser;
    return this.mailService.sendEmail(user.email, dto);
  }

  @Post('reply/:id')
  async replyToEmail(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: Omit<SendEmailDto, 'inReplyTo'>,
  ) {
    const user = req.user as AuthenticatedUser;
    const originalEmail = await this.mailService.getEmail(user.email, id);
    
    return this.mailService.sendEmail(user.email, {
      ...dto,
      inReplyTo: originalEmail.id,
      subject: dto.subject || `Re: ${originalEmail.subject}`,
    });
  }

  @Post('watch')
  async setupWatch(@Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.mailService.setupWatch(user.email);
  }
}
