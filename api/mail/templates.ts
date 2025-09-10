export function inviteTemplate(options: { inviterEmail: string; groupName: string; link: string }) {
  const { inviterEmail, groupName, link } = options;
  const subject = `You're invited to share expenses: ${groupName}`;
  const text = `Hello!\n\n${inviterEmail} invited you to join the group "${groupName}".\nOpen this link to accept the invite:\n${link}\n\nIf you didn't expect this, you can ignore this email.`;
  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif;line-height:1.5">
    <h2>You're invited to <em>${escapeHtml(groupName)}</em></h2>
    <p><strong>${escapeHtml(inviterEmail)}</strong> invited you to join their group and split expenses.</p>
    <p><a href="${escapeAttr(link)}" style="display:inline-block;padding:10px 16px;background:#16a34a;color:#fff;text-decoration:none;border-radius:6px">Accept invite</a></p>
    <p>If the button doesn't work, open this link:<br><code>${escapeHtml(link)}</code></p>
  </div>`;
  return { subject, text, html };
}

function escapeHtml(s: string) { return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'} as any)[c]); }
function escapeAttr(s: string) { return String(s).replace(/"/g, '&quot;'); }

