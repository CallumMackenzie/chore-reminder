import Twilio from "twilio";

export interface TwilioCredentials {
  accountSid: string;
  apiKeySid: string;
  apiKeySecret: string;
  fromPhone: string;
}

export function sendSms(to: string, body: string, credentials: TwilioCredentials): Promise<string> {
  const { accountSid, apiKeySid, apiKeySecret, fromPhone } = credentials;
  const client = Twilio(apiKeySid, apiKeySecret, { accountSid });

  return client.messages.create({ from: fromPhone, to, body }).then((message) => message.sid);
}
