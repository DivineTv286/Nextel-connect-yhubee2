export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
    }

    const { fullName, email, planName, amount } = req.body;

    if (!email || !fullName) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const formattedAmount = amount ? Number(amount).toLocaleString() : '0';

    try {
        const apiKey = process.env.BREVO_API_KEY;
        const senderEmail = process.env.SENDER_EMAIL || "divinetv183@gmail.com";

        // Step 1: Save/Upsert user directly into Brevo Contacts list
        await fetch('https://api.brevo.com/v3/contacts', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': apiKey,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                attributes: {
                    FIRSTNAME: fullName.split(' ')[0],
                    LASTNAME: fullName.split(' ').slice(1).join(' ') || '',
                    PLAN: planName || 'Standard'
                },
                updateEnabled: true // Updates user info if they already exist
            })
        });

        // Step 2: Send your custom Welcome & Activation Email
        const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': apiKey,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                sender: {
                    name: "Nextel Connect",
                    email: senderEmail
                },
                to: [{ email: email, name: fullName }],
                subject: "Welcome to NEXTEL CONNECT — Complete Your Activation",
                htmlContent: `
                    <div style="font-family: 'Poppins', Arial, sans-serif; background-color: #071a0f; color: #ffffff; padding: 30px; border-radius: 12px; max-width: 600px; margin: auto;">
                        <h2 style="color: #C9A84C; margin-bottom: 5px;">NEXTEL CONNECT</h2>
                        <p style="font-size: 1.1rem; margin-top: 0;">Dear <strong>${fullName}</strong>,</p>
                        
                        <p>Thank you for choosing <strong>NEXTEL CONNECT</strong> — your digital telecom and rewards platform.</p>
                        <p>We’re pleased to inform you that your registration was successful, and your account is currently <strong>pending activation</strong>.</p>
                        
                        <div style="background: rgba(255,255,255,0.05); padding: 15px 20px; border-radius: 8px; margin: 20px 0; border: 1px solid rgba(201,168,76,0.3);">
                            <p style="margin: 5px 0;"><strong>Selected Plan:</strong> ${planName || 'Standard Plan'}</p>
                            <p style="margin: 5px 0;"><strong>Activation Fee:</strong> ₦${formattedAmount}</p>
                        </div>

                        <h3 style="color: #C9A84C; border-bottom: 1px solid rgba(201,168,76,0.2); padding-bottom: 5px;">Complete Your Activation</h3>
                        <p>Kindly complete your one-time activation payment using the official bank details below:</p>

                        <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #C9A84C;">
                            <p style="margin: 3px 0;"><strong>Bank Name:</strong>STERLING BANK</p>
                            <p style="margin: 3px 0;"><strong>Account Number:</strong> 9710762021</p>
                            <p style="margin: 3px 0;"><strong>Account Name:</strong>OMINIPAY LIMITED/UWAKMFON AKPANOWO - NEXTEL</p>
                            <p style="margin: 3px 0;"><strong>Amount:</strong> ₦${formattedAmount}</p>
                        </div>

                        <p>After making payment, please submit your payment proof through the official Nextel activation channel so your account can be verified and activated.</p>

                        <div style="text-align: center; margin: 30px 0;">
                            <a href="https://nextel-web.vercel.app/payment.html" style="background-color: #C9A84C; color: #071a0f; padding: 12px 25px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">📤 SUBMIT PAYMENT PROOF</a>
                        </div>

                        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.8);">If you have already made your payment, kindly submit your receipt for confirmation.</p>
                        <p style="font-size: 0.9rem; color: rgba(255,255,255,0.8);">Need help? Contact Nextel Support today.</p>
                        
                        <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 25px 0;">
                        <p style="color: rgba(255,255,255,0.5); font-size: 0.8rem; text-align: center;">Thank you for choosing NEXTEL CONNECT.<br>The NEXTEL Team</p>
                    </div>
                `
            })
        });

        const emailData = await emailResponse.json();

        if (!emailResponse.ok) {
            throw new Error(emailData.message || 'Failed to send welcome email');
        }

        return res.status(200).json({ success: true, message: 'Contact saved and activation email sent successfully!' });

    } catch (error) {
        console.error('Brevo Integration Error:', error);
        return res.status(500).json({ success: false, message: error.message || 'Internal Server Error' });
    }
}
