export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Pull the lead info out, then forward ONLY the Anthropic payload to the API
    const { lead, ...anthropicBody } = req.body || {};

    // Forward request to Anthropic
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(anthropicBody)
    });

    const data = await response.json();

    // Pull the AI's written analysis text out of the response
    let analysisText = '';
    try {
      analysisText = (data.content || []).map(b => b.text || '').join('\n').trim();
    } catch (e) {
      analysisText = '(Could not parse analysis text.)';
    }

    // Send email notification via Resend
    try {
      const L = lead || {};
      const esc = s => String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const analysisHtml = esc(analysisText).replace(/\n/g, '<br>');

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: 'HVAC Proposal Decoder <leads@askrileyhvac.com>',
          to: 'askrileyhvac@gmail.com',
          reply_to: L.email || undefined,
          subject: `New Lead: ${L.name || 'Unknown'}${L.timeline ? ' — ' + L.timeline : ''}`,
          html: `
            <h2>New Proposal Submission</h2>
            <table style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6">
              <tr><td><strong>Name:</strong></td><td>${esc(L.name) || '—'}</td></tr>
              <tr><td><strong>Email:</strong></td><td>${esc(L.email) || '—'}</td></tr>
              <tr><td><strong>Address:</strong></td><td>${esc(L.addr) || '—'}</td></tr>
              <tr><td><strong>Timeline:</strong></td><td>${esc(L.timeline) || '—'}</td></tr>
              <tr><td><strong>Multiple systems/zones:</strong></td><td>${esc(L.zoned) || '—'}</td></tr>
              <tr><td><strong>Space usage:</strong></td><td>${esc(L.usage) || '—'}</td></tr>
              <tr><td><strong>Plans to stay:</strong></td><td>${esc(L.tenure) || '—'}</td></tr>
            </table>
            <p><strong>Submitted:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}</p>
            <hr>
            <h3>AI Analysis Sent to Homeowner</h3>
            <div style="font-family:Arial,sans-serif;font-size:13px;line-height:1.6;color:#374151">${analysisHtml}</div>
          `
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
