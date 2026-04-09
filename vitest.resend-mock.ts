// stub for resend SDK so pure function tests don't need API keys
export class Resend {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_key?: string) {}
  emails = { send: async () => ({}) };
  batch = { send: async () => ({}) };
}
