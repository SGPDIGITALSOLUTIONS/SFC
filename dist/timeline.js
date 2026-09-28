(() => {
  const style = document.createElement('style');
  style.textContent = `
    .evidence-board{margin:24px 0 34px;padding:26px;border:1px solid rgba(229,189,142,.2);border-radius:28px;background:linear-gradient(145deg,rgba(55,21,34,.94),rgba(24,10,17,.98));box-shadow:0 30px 80px rgba(0,0,0,.18)}
    .evidence-head{display:flex;align-items:end;justify-content:space-between;gap:18px}.evidence-head h2{font:400 2.25rem/1 Italiana,serif;margin:5px 0}.evidence-head p{margin:0;color:var(--muted);font-size:.9rem}.evidence-head-actions{display:flex;gap:9px;flex-wrap:wrap}.evidence-head-actions .btn{white-space:nowrap}.btn-secondary{background:rgba(255,255,255,.07);border:1px solid rgba(229,189,142,.22);color:var(--cream)}
    .case-profile-card{display:flex;gap:15px;align-items:center;margin:22px 0;padding:15px 17px;border-radius:19px;background:rgba(255,255,255,.035);border:1px solid rgba(229,189,142,.12)}.case-profile-photo{width:56px;height:56px;flex:0 0 56px;border-radius:18px;object-fit:cover;background:#4a1b2b;border:1px solid rgba(229,189,142,.24)}.case-profile-fallback{display:grid;place-items:center;font:400 1.65rem Italiana,serif;color:var(--cream)}.case-profile-card strong{display:block;font-size:1rem}.case-profile-card span{display:block;margin-top:3px;color:var(--muted);font-size:.84rem}
    .evidence-feed{position:relative;display:grid;gap:14px;padding-left:23px}.evidence-feed:before{content:"";position:absolute;top:4px;bottom:4px;left:5px;width:1px;background:linear-gradient(var(--rose),rgba(215,101,130,.08))}.evidence-post{position:relative;padding:18px;border:1px solid rgba(229,189,142,.16);border-radius:20px;background:linear-gradient(145deg,rgba(255,255,255,.045),rgba(0,0,0,.08))}.evidence-post:before{content:"";position:absolute;top:25px;left:-24px;width:9px;height:9px;border:3px solid var(--rose);border-radius:50%;background:var(--ink);box-shadow:0 0 0 5px rgba(215,101,130,.09)}.evidence-post.friend:before{border-color:var(--gold)}.post-top{display:flex;justify-content:space-between;gap:12px;align-items:start}.post-author{display:flex;gap:10px;align-items:center}.post-author-mark{width:32px;height:32px;display:grid;place-items:center;border-radius:10px;background:#4a1b2b;color:var(--cream);font-size:.88rem;font-weight:700}.post-author.friend .post-author-mark{background:rgba(229,189,142,.16);color:var(--gold)}.post-author strong{display:block;font-size:.9rem}.post-author span,.post-date{display:block;color:var(--muted);font-size:.76rem}.post-kind{display:inline-block;padding:4px 8px;border-radius:999px;background:rgba(215,101,130,.13);color:#f092a8;font-size:.72rem}.post-body{margin:16px 0 13px;white-space:pre-wrap;line-height:1.55}.evidence-image{display:block;width:100%;max-height:420px;object-fit:cover;border-radius:14px;border:1px solid rgba(229,189,142,.18);background:#180b11}.post-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:14px}.reaction{border:1px solid rgba(229,189,142,.16);border-radius:999px;padding:7px 10px;background:rgba(255,255,255,.03);color:var(--cream);font:600 .78rem "DM Sans",sans-serif;cursor:pointer}.reaction.active{border-color:var(--rose);background:rgba(215,101,130,.18);color:#ffd9e3}.comments{margin-top:15px;padding-top:14px;border-top:1px solid rgba(229,189,142,.12)}.comment{display:flex;gap:9px;padding:9px 0}.comment-mark{width:24px;height:24px;flex:0 0 24px;display:grid;place-items:center;border-radius:8px;background:rgba(229,189,142,.14);color:var(--gold);font-size:.68rem;font-weight:700}.comment-body{font-size:.84rem;line-height:1.45}.comment-body b{margin-right:5px}.comment-body small{display:block;margin-top:2px;color:var(--muted);font-size:.72rem}.comment-form{display:flex;gap:8px;margin-top:9px}.comment-form input{min-width:0;flex:1;border:1px solid rgba(229,189,142,.16);border-radius:12px;background:#180b11;color:var(--cream);padding:10px 12px;font:inherit}.comment-form button{border:0;border-radius:12px;background:var(--gold);color:var(--ink);padding:0 13px;font:700 .78rem "DM Sans",sans-serif;cursor:pointer}.evidence-empty{padding:28px 8px;color:var(--muted);text-align:center}
    @media(max-width:760px){.evidence-board{padding:20px 16px}.evidence-head{display:grid;align-items:start}.evidence-head-actions{width:100%}.evidence-head-actions .btn{flex:1}.evidence-feed{padding-left:20px}.evidence-post{padding:15px}.evidence-post:before{left:-21px}.post-top{display:grid}.post-date{margin-left:42px}.comment-form{align-items:stretch}.comment-form button{padding:0 11px}}
  `;
  document.head.append(style);

  const q = selector => document.querySelector(selector);
  const safe = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const postKey = post => `${post.title || ''}|${post.body || ''}|${post.kind || ''}`;
  const initials = name => String(name || '?').trim().slice(0, 2).toUpperCase();
  const nowLabel = date => date ? new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Just now';

  function makePost(event, index) {
    if (!Array.isArray(event)) return event;
    return { id: `legacy-${index}-${Date.now()}`, body: event[0], title: event[1], kind: event[2] || 'Update', authorRole: event[1]?.toLowerCase().includes('friend') ? 'friend' : 'owner', createdAt: null, comments: [], reactions: {} };
  }

  function upgradeCase(caseItem) {
    if (!Array.isArray(caseItem.posts)) caseItem.posts = [];
    const known = new Set(caseItem.posts.map(postKey));
    (caseItem.events || []).forEach((event, index) => {
      const draft = makePost(event, index);
      if (!known.has(postKey(draft))) {
        caseItem.posts.push(draft);
        known.add(postKey(draft));
      }
    });
    caseItem.posts.forEach((post, index) => {
      post.id ||= `post-${caseItem.id}-${index}`;
      post.comments ||= [];
      post.reactions ||= {};
      post.authorRole ||= 'owner';
    });
    return caseItem.posts;
  }

  async function imageData(file) {
    if (!file) return '';
    if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
    if (file.size > 2 * 1024 * 1024) throw new Error('Keep images under 2 MB for now.');
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('That image could not be read.'));
      reader.readAsDataURL(file);
    });
  }

  function profileMarkup(caseItem) {
    const image = caseItem.profileImage
      ? `<img class="case-profile-photo" src="${caseItem.profileImage}" alt="${safe(caseItem.name)} profile photo">`
      : `<div class="case-profile-photo case-profile-fallback" aria-hidden="true">${safe(initials(caseItem.name))}</div>`;
    return `${image}<div><strong>${safe(caseItem.name)}</strong><span>${caseItem.archived ? 'Case closed · record preserved' : `${caseItem.posts.length} evidence post${caseItem.posts.length === 1 ? '' : 's'} · reviewer can react and comment`}</span></div>`;
  }

  function reactionMarkup(post, emoji, label) {
    const people = post.reactions[emoji] || [];
    const active = people.includes(role);
    return `<button type="button" class="reaction ${active ? 'active' : ''}" data-reaction="${emoji}" data-post="${safe(post.id)}" aria-pressed="${active}">${emoji} ${people.length || ''}<span class="sr-only"> ${label}</span></button>`;
  }

  function postMarkup(post, caseItem) {
    const isFriend = post.authorRole === 'friend';
    const author = isFriend ? 'Friend' : 'You';
    const comments = post.comments.length ? post.comments.map(comment => `<div class="comment"><div class="comment-mark">${comment.authorRole === 'friend' ? 'F' : 'Y'}</div><div class="comment-body"><b>${comment.authorRole === 'friend' ? 'Friend' : 'You'}</b>${safe(comment.body)}<small>${nowLabel(comment.createdAt)}</small></div></div>`).join('') : '';
    return `<article class="evidence-post ${isFriend ? 'friend' : ''}"><div class="post-top"><div class="post-author ${isFriend ? 'friend' : ''}"><div class="post-author-mark">${isFriend ? 'F' : 'Y'}</div><div><strong>${author}</strong><span>${safe(post.title || 'Evidence logged')}</span></div></div><div><span class="post-kind">${safe(post.kind || 'Update')}</span><span class="post-date">${nowLabel(post.createdAt)}</span></div></div><div class="post-body">${safe(post.body)}</div>${post.image ? `<img class="evidence-image" src="${post.image}" alt="Evidence attachment">` : ''}<div class="post-actions">${reactionMarkup(post, '🚩', 'Flag')}${reactionMarkup(post, '👀', 'Watching')}${reactionMarkup(post, '🔥', 'Unfortunately hot')}${reactionMarkup(post, '😂', 'Chaos')}</div><div class="comments">${comments}${caseItem.archived ? '' : `<form class="comment-form" data-comment-form="${safe(post.id)}"><input required maxlength="280" aria-label="Comment on this evidence" placeholder="Add your take…"><button type="submit">Reply</button></form>`}</div></article>`;
  }

  function renderEvidence() {
    const caseItem = current();
    const posts = upgradeCase(caseItem);
    q('#caseProfileCard').innerHTML = profileMarkup(caseItem);
    q('#evidenceSub').textContent = caseItem.archived ? 'This timeline is closed, but every receipt remains.' : 'Screenshots, updates, reactions and the group-chat verdicts.';
    q('#evidenceFeed').innerHTML = posts.length ? posts.map(post => postMarkup(post, caseItem)).join('') : '<div class="evidence-empty">No evidence yet. Start the case file with a profile photo, screenshot, or update.</div>';
    q('#addEvidenceBtn').onclick = () => { if (!caseItem.archived) openModal('#updateModal'); };
    q('#changeProfileBtn').onclick = () => { if (!caseItem.archived) q('#caseProfileUpload').click(); };
    q('#caseProfileUpload').onchange = async event => {
      try {
        const image = await imageData(event.target.files[0]);
        if (!image) return;
        const body = `Added a profile photo for ${caseItem.name}.`;
        caseItem.profileImage = image;
        const post = { id: `post-${Date.now()}`, body, title: 'Profile photo added', kind: 'Profile', image, authorRole: role, createdAt: new Date().toISOString(), comments: [], reactions: {} };
        upgradeCase(caseItem).unshift(post);
        caseItem.events.unshift([body, 'Profile photo added', 'Profile']);
        save(); render(); toast('Profile photo added to the timeline.');
      }
      catch (error) { toast(error.message); }
      event.target.value = '';
    };
    document.querySelectorAll('[data-reaction]').forEach(button => button.onclick = () => {
      const post = posts.find(item => item.id === button.dataset.post);
      const emoji = button.dataset.reaction;
      const people = post.reactions[emoji] || [];
      post.reactions[emoji] = people.includes(role) ? people.filter(person => person !== role) : [...people, role];
      save(); renderEvidence();
    });
    document.querySelectorAll('[data-comment-form]').forEach(form => form.onsubmit = event => {
      event.preventDefault();
      const input = form.querySelector('input');
      const body = input.value.trim();
      if (!body) return;
      const post = posts.find(item => item.id === form.dataset.commentForm);
      post.comments.unshift({ id: `comment-${Date.now()}`, body, authorRole: role, createdAt: new Date().toISOString() });
      save(); renderEvidence();
    });
  }

  const oldRender = render;
  render = function (...args) { oldRender.apply(this, args); renderEvidence(); };

  q('#updateForm').onsubmit = async event => {
    event.preventDefault();
    const caseItem = current();
    if (caseItem.archived) return;
    try {
      const text = q('#updateText').value.trim();
      const kind = q('#updateKind').value;
      const delta = Number(q('#scoreChange').value);
      const image = await imageData(q('#evidenceImage').files[0]);
      const post = { id: `post-${Date.now()}`, body: text, title: `${kind} entered`, kind, image, authorRole: role, createdAt: new Date().toISOString(), comments: [], reactions: {} };
      upgradeCase(caseItem).unshift(post);
      caseItem.events.unshift([text, `${kind} entered`, kind]);
      caseItem.score = Math.max(0, Math.min(100, caseItem.score + delta));
      if (kind === 'Ick') caseItem.danger = Math.min(100, caseItem.danger + 7);
      if (kind === 'Green flag') caseItem.potential = Math.min(100, caseItem.potential + 6);
      if (kind === 'Horny override') caseItem.delusion = Math.min(100, caseItem.delusion + 12);
      save(); render(); event.target.reset(); q('#scoreChangeValue').textContent = '0'; closeAll(); toast(image ? 'Evidence uploaded. The receipts are in.' : 'Evidence entered. The plot thickens.');
    } catch (error) { toast(error.message); }
  };

  q('#newCaseForm').onsubmit = async event => {
    event.preventDefault();
    try {
      const name = q('#newName').value.trim();
      const note = q('#newNote').value.trim() || 'No opinion yet. That itself is suspicious.';
      const profileImage = await imageData(q('#newProfileImage').files[0]);
      const id = Math.max(...cases.map(item => item.id), 0) + 1;
      const profileBody = `Added a profile photo for ${name}.`;
      const profilePost = profileImage ? [{ id: `post-${Date.now()}`, body: profileBody, title: 'Profile photo added', kind: 'Profile', image: profileImage, authorRole: role, createdAt: new Date().toISOString(), comments: [], reactions: {} }] : [];
      const profileEvent = profileImage ? [[profileBody, 'Profile photo added', 'Profile']] : [];
      cases.push({ id, name, profileImage, days: 1, dates: 0, score: 50, potential: 50, danger: 50, chemistry: 50, delusion: 25, note, archived: false, events: profileEvent, posts: profilePost });
      activeId = id; save(); render(); event.target.reset(); closeAll(); toast('Case opened. Add the first receipt.');
    } catch (error) { toast(error.message); }
  };

  renderEvidence();
})();
