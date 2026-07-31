import Twilio from "twilio";

export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  fromPhone: string;
}

export function sendSms(to: string, body: string, credentials: TwilioCredentials): Promise<string> {
  const { accountSid, authToken, fromPhone } = credentials;
  const client = Twilio(accountSid, authToken);

  return client.messages.create({ from: fromPhone, to, body }).then((message) => message.sid);
}
