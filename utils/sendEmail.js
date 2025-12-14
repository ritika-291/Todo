import {Resend} from "resend";
import { generateVerifyEmailHtml } from "./emails/verify-email.js";

// Remove the top-level Resend initialization
// const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(to, code, resendApiKey, fromEmail) { // Add resendApiKey and fromEmail as arguments
  const resend = new Resend(resendApiKey); // Initialize Resend here
  const verifyUrl = "http://localhost:3000/verify-email";

  const html = generateVerifyEmailHtml(code, verifyUrl);

  await resend.emails.send({
    from: fromEmail, // Use the passed fromEmail
    to,
    subject: "Verify Your Email Address",
    html
  });

  console.log("✅ Verification email sent to:", to);
}
