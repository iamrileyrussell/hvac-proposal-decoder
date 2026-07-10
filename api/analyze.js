export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};

    // Handle call request
    if (body.callRequest) {
      const L = body.lead || {};
      const esc = s => String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: 'HVAC Proposal Decoder <leads@askrileyhvac.com>',
          to: 'askrileyhvac@gmail.com',
          reply_to: L.email || undefined,
          subject: `📞 Call Request: ${esc(L.name) || 'A homeowner'} wants to talk`,
          html: `
            <h2>📞 Free Call Request</h2>
            <p style="font-size:16px"><strong>${esc(L.name) || 'A homeowner'}</strong> just requested a free 15-minute call after reading their proposal analysis.</p>
            <table style="font-family:Arial,sans-serif;font-size:14px;line-height:1.8">
              <tr><td style="padding-right:16px"><strong>Name:</strong></td><td>${esc(L.name) || '—'}</td></tr>
              <tr><td><strong>Email:</strong></td><td>${esc(L.email) || '—'}</td></tr>
            </table>
            <p style="margin-top:16px;font-size:14px;color:#64748B">Reach out to them directly to get a call scheduled.</p>
          `
        })
      });
      return res.status(200).json({ ok: true });
    }

    // Handle feedback-only submissions
    if (body.feedback) {
      const L = body.lead || {};
      const esc = s => String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
        body: JSON.stringify({
          from: 'HVAC Proposal Decoder <leads@askrileyhvac.com>',
          to: 'askrileyhvac@gmail.com',
          subject: `Feedback: ${body.rating || '?'} stars — ${esc(L.name) || 'Unknown'}`,
          html: `<h2>Homeowner Feedback</h2>
                 <p><strong>Name:</strong> ${esc(L.name) || '—'}</p>
                 <p><strong>Rating:</strong> ${'⭐'.repeat(body.rating || 0)} (${body.rating || 0}/5)</p>
                 <p><strong>Comment:</strong> ${esc(body.comment) || '(none)'}</p>`
        })
      });
      return res.status(200).json({ ok: true });
    }

    // Pull lead info out — do NOT forward it to Anthropic
    const { lead, ...anthropicBody } = body;

    // Forward to Anthropic
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

    // Pull AI analysis text
    let analysisText = '';
    try {
      analysisText = (data.content || []).map(b => b.text || '').join('\n').trim();
    } catch (e) {
      analysisText = '(Could not extract analysis text.)';
    }

    // Send lead email
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
          subject: `New Lead: ${L.name || 'Unknown'}${L.timeline ? ' — ' + L.timeline : ''}${L.comparing ? ' [COMPARISON]' : ''}`,
          html: `
            <h2>New Proposal Submission</h2>
            <table style="font-family:Arial,sans-serif;font-size:14px;line-height:1.8;border-collapse:collapse">
              <tr><td style="padding-right:16px"><strong>Name:</strong></td><td>${esc(L.name) || '—'}</td></tr>
              <tr><td><strong>Email:</strong></td><td>${esc(L.email) || '—'}</td></tr>
              <tr><td><strong>Address:</strong></td><td>${esc(L.addr) || '—'}</td></tr>
              <tr><td><strong>Timeline:</strong></td><td>${esc(L.timeline) || '—'}</td></tr>
              <tr><td><strong>Comparing proposals:</strong></td><td>${L.comparing ? 'YES — Side-by-side comparison' : 'No'}</td></tr>
              <tr><td><strong>Multiple zones:</strong></td><td>${esc(L.zoned) || '—'}</td></tr>
              <tr><td><strong>Space usage:</strong></td><td>${esc(L.usage) || '—'}</td></tr>
              <tr><td><strong>Plans to stay:</strong></td><td>${esc(L.tenure) || '—'}</td></tr>
              ${L.comments ? `<tr><td><strong>Their thoughts:</strong></td><td><em>"${esc(L.comments)}"</em></td></tr>` : ''}
            </table>
            <p style="font-size:12px;color:#64748B"><strong>Submitted:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}</p>
            <hr>
            <h3>AI Analysis Sent to Homeowner</h3>
            <div style="font-family:Arial,sans-serif;font-size:13px;line-height:1.7;color:#374151">${analysisHtml}</div>
          `
        })
      });
    } catch (emailError) {
      console.error('Resend error:', emailError);
    }

    res.status(response.status).json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
