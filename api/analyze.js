export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Forward request to Anthropic
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();

    // Send email notification via Resend
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: 'HVAC Proposal Decoder <leads@askrileyhvac.com>',
          to: 'askrileyhvac@gmail.com',
          subject: 'New Proposal Submission — HVAC Decoder',
          html: `<p>A homeowner just submitted a proposal for analysis.</p>
                 <p><strong>Time:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}</p>
                 <p>Log in to review their contact info and follow up.</p>`
        })
      });
    } catch (emailError) {
      console.error('Resend error:', emailError);
      // Don't fail the main request if email fails
    }

    res.status(response.status).json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
