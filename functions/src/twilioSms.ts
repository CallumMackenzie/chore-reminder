import Twilio from "twilio";

export function sendSms(to: string, body: string): Promise<string> {
  const accountSid = requireEnv("TWILIO_ACCOUNT_SID");
  const authToken = requireEnv("TWILIO_AUTH_TOKEN");
  const from = requireEnv("TWILIO_FROM_NUMBER");
  const client = Twilio(accountSid, authToken);

  return client.messages.create({ from, to, body }).then((message) => message.sid);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`missing required environment variable: ${name}`);
  }
  return value;
}
