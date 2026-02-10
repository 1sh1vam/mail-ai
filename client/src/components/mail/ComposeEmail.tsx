import { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useUIStore, useMailStore } from '@/store';
import { mailService } from '@/services/mailService';
import { Send, X } from 'lucide-react';

export function ComposeEmail() {
  const { compose, closeCompose, updateCompose, resetCompose } = useUIStore();
  const { setSending, isSending } = useMailStore();
  const toInputRef = useRef<HTMLInputElement>(null);

  // Focus on "To" field when dialog opens
  useEffect(() => {
    if (compose.isOpen && toInputRef.current) {
      setTimeout(() => toInputRef.current?.focus(), 100);
    }
  }, [compose.isOpen]);

  const handleSend = async () => {
    if (!compose.to || !compose.subject) {
      alert('Please fill in recipient and subject');
      return;
    }

    setSending(true);
    try {
      if (compose.replyToId) {
        await mailService.replyToEmail(
          compose.replyToId,
          compose.subject,
          compose.body,
          compose.to
        );
      } else {
        await mailService.sendEmail(compose.to, compose.subject, compose.body);
      }
      resetCompose();
    } catch (error) {
      console.error('Failed to send email:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (compose.to || compose.subject || compose.body) {
      if (confirm('Discard this email?')) {
        resetCompose();
      }
    } else {
      closeCompose();
    }
  };

  return (
    <Dialog open={compose.isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {compose.replyToId ? 'Reply' : 'New Message'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">To</label>
            <Input
              ref={toInputRef}
              type="email"
              placeholder="recipient@example.com"
              value={compose.to}
              onChange={(e) => updateCompose({ to: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Subject</label>
            <Input
              type="text"
              placeholder="Subject"
              value={compose.subject}
              onChange={(e) => updateCompose({ subject: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Message</label>
            <Textarea
              placeholder="Write your message..."
              value={compose.body}
              onChange={(e) => updateCompose({ body: e.target.value })}
              className="min-h-[200px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSending}>
            <X className="h-4 w-4 mr-2" />
            Discard
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            <Send className="h-4 w-4 mr-2" />
            {isSending ? 'Sending...' : 'Send'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
