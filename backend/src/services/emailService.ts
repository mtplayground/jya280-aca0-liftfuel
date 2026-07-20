import type { AppConfig } from '../config';
import { HttpError } from '../errors';

type SendEmailInput = {
  html: string;
  subject: string;
  text?: string;
  to: string;
};

export type EmailDeliveryResult = {
  delivery: 'sent' | 'skipped';
};

export async function sendEmail(
  config: AppConfig,
  input: SendEmailInput
): Promise<EmailDeliveryResult> {
  if (!config.emailUrl || !config.emailAppToken) {
    return { delivery: 'skipped' };
  }

  const response = await fetch(config.emailUrl, {
    body: JSON.stringify({
      html: input.html,
      subject: input.subject,
      text: input.text,
      to: input.to
    }),
    headers: {
      Authorization: `Bearer ${config.emailAppToken}`,
      'Content-Type': 'application/json'
    },
    method: 'POST'
  });

  if (response.status === 429) {
    throw new HttpError(429, 'EMAIL_RATE_LIMITED', 'Email is rate limited; try again shortly.');
  }

  if (!response.ok) {
    throw new HttpError(502, 'EMAIL_SEND_FAILED', `Email send failed with status ${response.status}.`);
  }

  return { delivery: 'sent' };
}
