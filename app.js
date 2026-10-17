(() => {
  const rolesList = ['Voice Over Artist','Script Writer','Story Writer','Animator / Video Editor','Character Designer','Background & Thumbnail Designer','Sound Effects / Music','Idea & Story Planner'];
  const storiesList = ['Moral','Horror','Comedy','Emotional','Adventure','Mystery / Suspense','Fantasy / Magical','Kids Learning / Educational','All Types'];
  const $ = id => document.getElementById(id);
  const form = $('applicationForm'), error = $('formError'), contactMethod = $('contactMethod');
  let supabase = null, rapidClicks = 0, clickTimer = null, currentApps = [];
  if (window.supabase && window.DREAMKATHA_CONFIG?.SUPABASE_URL && window.DREAMKATHA_CONFIG?.SUPABASE_PUBLISHABLE_KEY) {
    supabase = window.supabase.createClient(window.DREAMKATHA_CONFIG.SUPABASE_URL, window.DREAMKATHA_CONFIG.SUPABASE_PUBLISHABLE_KEY);
  }
  $('year').textContent = new Date().getFullYear();
  function addChoices(targetId, values, name) {
    $(targetId).innerHTML = values.map((v,i) => `<label class="choice"><input type="checkbox" name="${name}" value="${v.replaceAll('&','&amp;').replaceAll('"','&quot;')}" id="${name}-${i}"><span>${v}</span></label>`).join('');
  }
  addChoices('roles', rolesList, 'roles'); addChoices('storyTypes', storiesList, 'story_types');
  $('storyTypes').addEventListener('change', e => {
    if (e.target.name !== 'story_types') return;
    const all = $('storyTypes').querySelector('input[value="All Types"]');
    const others = [...$('storyTypes').querySelectorAll('input[name="story_types"]')].filter(x => x !== all);
    if (e.target === all && all.checked) others.forEach(x => x.checked = false);
    else if (e.target !== all && e.target.checked) all.checked = false;
  });
  const contactPickerButton = $('contactPickerButton'), contactPickerMenu = $('contactPickerMenu');
  contactPickerButton.addEventListener('click', () => {
    const opening = contactPickerMenu.hidden;
    contactPickerMenu.hidden = !opening;
    contactPickerButton.setAttribute('aria-expanded', String(opening));
  });
  contactPickerMenu.addEventListener('click', e => {
    const option = e.target.closest('button[data-value]');
    if (!option) return;
    contactMethod.value = option.dataset.value;
    $('contactPickerLabel').textContent = option.textContent.replace(/^[^A-Za-z0-9]+/, '').trim();
    [...contactPickerMenu.querySelectorAll('button')].forEach(b => b.setAttribute('aria-selected', String(b === option)));
    contactPickerMenu.hidden = true;
    contactPickerButton.setAttribute('aria-expanded', 'false');
    contactMethod.dispatchEvent(new Event('change', { bubbles: true }));
  });
  document.addEventListener('click', e => {
    if (!$('contactPicker').contains(e.target)) { contactPickerMenu.hidden = true; contactPickerButton.setAttribute('aria-expanded', 'false'); }
  });
  contactMethod.addEventListener('change', () => {
    const method = contactMethod.value; $('contactField').hidden = !method;
    const field = $('contactValue'); field.required = !!method; field.value = '';
    const label = method === 'Mobile Number' ? 'Mobile number / WhatsApp' : method === 'Instagram ID' ? 'Instagram username or profile link' : 'Telegram username or profile link';
    $('contactLabel').innerHTML = `${label} <b>*</b>`;
    field.type = 'text'; field.placeholder = method === 'Mobile Number' ? '+91 **********' : method === 'Instagram ID' ? '@your_instagram_id' : '@your_telegram_id';
    $('contactHint').textContent = method === 'Mobile Number' ? 'Country code ke saath number likhein.' : 'Apna username ya profile link enter karein.';
  });
  $('logoSecret').addEventListener('click', () => {
    rapidClicks++; clearTimeout(clickTimer); clickTimer = setTimeout(() => rapidClicks = 0, 1100);
    if (rapidClicks >= 10) { rapidClicks = 0; $('adminModal').hidden = false; $('adminEmail').focus(); }
  });
  $('closeAdmin').addEventListener('click', () => $('adminModal').hidden = true);
  $('adminModal').addEventListener('click', e => { if (e.target === $('adminModal')) $('adminModal').hidden = true; });
  function showError(message) { error.textContent = message; error.hidden = false; }
  function picked(name) { return [...form.querySelectorAll(`input[name="${name}"]:checked`)].map(x => x.value); }
  form.addEventListener('submit', async e => {
    e.preventDefault(); error.hidden = true;
    const roles = picked('roles'), story_types = picked('story_types');
    if (!roles.length) return showError('Kam se kam ek role select karein.');
    if (!story_types.length) return showError('Kam se kam ek story type select karein.');
    if (!supabase) return showError('Supabase config load nahi hua. config.js aur internet connection check karein.');
    const data = { applicant_name: $('name').value.trim(), age: $('age').value ? Number($('age').value) : null, roles, story_types, experience: form.querySelector('input[name="experience"]:checked')?.value, contact_method: contactMethod.value, contact_value: $('contactValue').value.trim(), extra_details: $('details').value.trim() || null, status: 'Pending' };
    if (!data.experience || !data.contact_method || !data.contact_value) return showError('Please saare required fields complete karein.');
    const btn = form.querySelector('[type="submit"]'); btn.disabled = true; btn.firstElementChild.textContent = 'Submitting…';
    try {
      const { error: dbError } = await supabase.from('team_applications').insert(data);
      if (dbError) throw dbError;
      form.reset(); $('contactField').hidden = true; $('contactPickerLabel').textContent = 'Choose contact method'; [...contactPickerMenu.querySelectorAll('button')].forEach(b => b.setAttribute('aria-selected', 'false')); $('successModal').hidden = false;
    } catch (err) { console.error(err); showError(err.message?.includes('Failed to fetch') ? 'Connection error. Internet aur Supabase URL check karein.' : 'Application send nahi hui. Supabase SQL setup, table aur policies check karein. Details: ' + (err.message || 'Unknown error')); }
    finally { btn.disabled = false; btn.firstElementChild.textContent = 'Submit Application'; }
  });
  $('closeSuccess').addEventListener('click', () => $('successModal').hidden = true);
  $('successModal').addEventListener('click', e => { if (e.target === $('successModal')) $('successModal').hidden = true; });
  const loginError = $('loginError');
  $('loginForm').addEventListener('submit', async e => {
    e.preventDefault(); loginError.hidden = true;
    if (!supabase) { loginError.textContent = 'Supabase configuration unavailable.'; loginError.hidden = false; return; }
    const btn = e.currentTarget.querySelector('button[type="submit"]'); btn.disabled = true;
    try {
      const { error: signError } = await supabase.auth.signInWithPassword({ email: $('adminEmail').value.trim(), password: $('adminPassword').value });
      if (signError) throw signError;
      const { data: isAdmin, error: checkError } = await supabase.rpc('is_team_admin');
      if (checkError) throw checkError;
      if (!isAdmin) { await supabase.auth.signOut(); throw new Error('This account is not authorized.'); }
      $('adminModal').hidden = true; $('shellHack'); document.querySelector('.shell').hidden = true; $('dashboard').hidden = false; await loadApplications();
    } catch (err) { loginError.textContent = err.message || 'Sign-in failed.'; loginError.hidden = false; }
    finally { btn.disabled = false; }
  });
  async function loadApplications() {
    $('dashMessage').textContent = 'Loading applications…';
    const { data, error: fetchError } = await supabase.from('team_applications').select('*').order('created_at', {ascending:false});
    if (fetchError) { $('dashMessage').textContent = 'Could not load applications: ' + fetchError.message; return; }
    currentApps = data || []; renderApplications();
  }
  function contactHref(app) {
    const value = app.contact_value || '';
    if (app.contact_method === 'Mobile Number') return 'https://wa.me/' + value.replace(/\D/g,'');
    if (app.contact_method === 'Instagram ID') return value.startsWith('http') ? value : 'https://instagram.com/' + value.replace(/^@/,'');
    return value.startsWith('http') ? value : 'https://t.me/' + value.replace(/^@/,'');
  }
  function renderApplications() {
    const query = $('searchApps').value.toLowerCase(), status = $('statusFilter').value;
    const list = currentApps.filter(a => (status === 'all' || a.status === status) && [a.applicant_name,a.contact_value].some(v => (v||'').toLowerCase().includes(query)));
    $('dashMessage').textContent = `${list.length} application(s) shown · ${currentApps.length} total`;
    if (!list.length) { $('applicationList').innerHTML = '<div class="empty">No applications found.</div>'; return; }
    $('applicationList').innerHTML = list.map(a => `<article class="app-card" data-id="${a.id}">
      <div class="app-card-head"><div><h3>${escapeHtml(a.applicant_name)}${a.age ? ` <span class="app-meta">· ${a.age} yrs</span>` : ''}</h3><div class="app-meta">Application · ${new Date(a.created_at).toLocaleString()}</div></div><span class="status ${a.status}">${a.status}</span></div>
      <section class="app-section"><div class="app-section-title"><span class="section-number">01</span><div><h4>Basic details</h4><small>Name and age</small></div></div><div class="detail-line"><span>Name</span><strong>${escapeHtml(a.applicant_name)}</strong><button class="copy-btn" data-copy="${escapeAttr(a.applicant_name)}">Copy</button></div><div class="detail-line"><span>Age</span><strong>${a.age ? escapeHtml(a.age) : 'Not provided'}</strong>${a.age ? `<button class="copy-btn" data-copy="${escapeAttr(a.age)}">Copy</button>` : ''}</div></section>
      <section class="app-section"><div class="app-section-title"><span class="section-number">02</span><div><h4>Skills & interests</h4><small>What they selected</small></div></div><div class="detail-block"><span>Interested role(s)</span><div class="tag-list">${(a.roles||[]).map(v=>`<span class="detail-tag">${escapeHtml(v)}</span>`).join('')||'—'}</div></div><div class="detail-block"><span>Story type(s)</span><div class="tag-list">${(a.story_types||[]).map(v=>`<span class="detail-tag">${escapeHtml(v)}</span>`).join('')||'—'}</div></div><div class="detail-line"><span>Experience</span><strong>${escapeHtml(a.experience||'Not provided')}</strong></div></section>
      <section class="app-section"><div class="app-section-title"><span class="section-number">03</span><div><h4>Contact & message</h4><small>Reach out in one tap</small></div></div><div class="detail-line contact-detail"><span>${escapeHtml(a.contact_method||'Contact')}</span><strong>${escapeHtml(a.contact_value||'Not provided')}</strong><button class="copy-btn copy-contact" data-copy="${escapeAttr(a.contact_value||'')}">Copy</button></div><div class="contact-actions"><a class="small-btn contact-primary" href="${escapeAttr(contactHref(a))}" target="_blank" rel="noreferrer">${a.contact_method === 'Mobile Number' ? 'Open WhatsApp ↗' : a.contact_method === 'Instagram ID' ? 'Open Instagram ↗' : 'Open Telegram ↗'}</a></div><div class="detail-block message-block"><span>Extra details / story idea</span><p>${escapeHtml(a.extra_details||'No extra details provided')}</p>${a.extra_details ? `<button class="copy-btn" data-copy="${escapeAttr(a.extra_details)}">Copy message</button>` : ''}</div></section>
      <div class="app-actions admin-actions"><label class="status-label">Application status<select aria-label="Change application status" class="status-change" data-id="${a.id}">${['Pending','Accepted','Rejected','Contacted'].map(s=>`<option ${s===a.status?'selected':''}>${s}</option>`).join('')}</select></label><button class="small-btn delete-btn" data-delete="${a.id}">Delete application</button></div></article>`).join('');
  }
  function escapeHtml(v) { return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function escapeAttr(v) { return escapeHtml(v); }
  $('applicationList').addEventListener('change', async e => { if (!e.target.matches('.status-change')) return; const id=e.target.dataset.id, status=e.target.value; const {error:err}=await supabase.from('team_applications').update({status}).eq('id',id); if(err){alert('Status update failed: '+err.message);return;} const item=currentApps.find(a=>a.id===id); if(item)item.status=status; renderApplications(); });
  $('applicationList').addEventListener('click', async e => { const copy=e.target.closest('[data-copy]'); if(copy){ const value=copy.dataset.copy || ''; try { await navigator.clipboard.writeText(value); copy.textContent='Copied ✓'; setTimeout(()=>{if(copy.isConnected)copy.textContent=copy.classList.contains('copy-contact')?'Copy':'Copy';},1400); } catch { const ta=document.createElement('textarea'); ta.value=value; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); copy.textContent='Copied ✓'; } return; } const b=e.target.closest('[data-delete]'); if(!b)return; if(!confirm('Is application ko permanently delete karna hai?'))return; const {error:err}=await supabase.from('team_applications').delete().eq('id',b.dataset.delete); if(err){alert('Delete failed: '+err.message);return;} currentApps=currentApps.filter(a=>a.id!==b.dataset.delete); renderApplications(); });
  $('searchApps').addEventListener('input', renderApplications); $('statusFilter').addEventListener('change', renderApplications);
  $('logoutBtn').addEventListener('click', async () => { if(supabase) await supabase.auth.signOut(); $('dashboard').hidden=true; document.querySelector('.shell').hidden=false; $('loginForm').reset(); });
})();
