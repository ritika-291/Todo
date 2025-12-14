import fs from 'fs';
import path from 'path';
import mjml2html from 'mjml';

export function generateVerifyEmailHtml(code, verifyUrl){
    const mjmlPath = path.join(process.cwd(),"utils/emails/verify-emails.mjml"); // Corrected file name

    const mjmlTemplate = fs.readFileSync(mjmlPath, 'utf8');

    const filledTemplate = mjmlTemplate
    .replace("{{CODE}}", code   )
    .replace("{{VERIFY_URL}}", verifyUrl);

    const  {html}= mjml2html(filledTemplate);

    return html;
}