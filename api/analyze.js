export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};

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

    // Pull lead info and proposal files out before sending to Anthropic
    const { lead, proposalFile1, proposalFile2, ...anthropicBody } = body;

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

    // Send lead email with full details + analysis + proposal attachment
    try {
      const L = lead || {};
      const esc = s => String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const analysisHtml = esc(analysisText).replace(/\n/g, '<br>');
      const isComparing = L.comparing ? 'YES — Side-by-side comparison' : 'No';

      const attachments = [];
      if (proposalFile1) {
        attachments.push({
          filename: 'Proposal_A.pdf',
          content: proposalFile1,
          type: 'application/pdf',
          disposition: 'attachment'
        });
      }
      if (proposalFile2) {
        attachments.push({
          filename: 'Proposal_B.pdf',
          content: proposalFile2,
          type: 'application/pdf',
          disposition: 'attachment'
        });
      }

      const emailPayload = {
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
            <tr><td><strong>Comparing proposals:</strong></td><td>${isComparing}</td></tr>
            <tr><td><strong>Multiple zones:</strong></td><td>${esc(L.zoned) || '—'}</td></tr>
            <tr><td><strong>Space usage:</strong></td><td>${esc(L.usage) || '—'}</td></tr>
            <tr><td><strong>Plans to stay:</strong></td><td>${esc(L.tenure) || '—'}</td></tr>
            ${L.comments ? `<tr><td><strong>Their thoughts:</strong></td><td><em>"${esc(L.comments)}"</em></td></tr>` : ''}
          </table>
          <p style="font-size:12px;color:#64748B"><strong>Submitted:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}</p>
          ${attachments.length > 0 ? '<p><strong>📎 Proposal file(s) attached.</strong></p>' : '<p style="color:#94A3B8;font-size:12px">(Proposal was an image — not attached. See analysis below.)</p>'}
          <hr>
          <h3>AI Analysis Sent to Homeowner</h3>
          <div style="font-family:Arial,sans-serif;font-size:13px;line-height:1.7;color:#374151">${analysisHtml}</div>
        `
      };

      if (attachments.length > 0) {
        emailPayload.attachments = attachments;
      }

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
        },
        body: JSON.stringify(emailPayload)
      });
    } catch (emailError) {
      console.error('Resend error:', emailError);
    }

    res.status(response.status).json(data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
