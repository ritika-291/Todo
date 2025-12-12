import nodemailer from "nodemailer";

export async function sendVerificationEmail(to, code) {
  
  // Create a test account automatically
  const testAccount = await nodemailer.createTestAccount();

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });

  // Email content
  const info = await transporter.sendMail({
    from: `"MyApp" <no-reply@myapp.com>`,
    to,
    subject: "Your Email Verification Code",
    html: `
      <h2>Your Verification Code</h2>
      <p>Enter this 8-digit code to verify your email:</p>
      <h3>${code}</h3>
    `
  });

  console.log("📨 Message sent: ", info.messageId);
  console.log("🔗 Preview URL: ", nodemailer.getTestMessageUrl(info));
}
