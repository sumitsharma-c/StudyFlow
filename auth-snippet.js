/**
 * auth-snippet.js
 * - Add to index.html: <script src="auth-snippet.js"></script> before </body>
 * - Behavior:
 *    • Not signed in: shows two clickable buttons in header: "User" (redirects to login.html) and "Guest" (immediately signs in as guest & reloads)
 *    • Signed in: shows pill (avatar+name/guest) + Sign out button (primary gradient)
 */

(function(){
  const ENFORCE_LOGIN = false;
  const LOGIN_PAGE = 'login.html';
  const KEY_LOGGED = 'sf_logged_in';
  const KEY_EMAIL = 'sf_user_email';

  function isLogged(){ try { return localStorage.getItem(KEY_LOGGED) === '1'; } catch(e){ return false; } }
  function getEmail(){ try { return localStorage.getItem(KEY_EMAIL) || ''; } catch(e){ return ''; } }
  function goLogin(preserve=true){ const r = preserve ? encodeURIComponent(window.location.pathname + window.location.search) : ''; window.location.href = LOGIN_PAGE + (r ? '?return=' + r : ''); }
  function signGuest(){ try { localStorage.setItem(KEY_LOGGED, '1'); localStorage.setItem(KEY_EMAIL, 'guest@studyflow.local'); localStorage.removeItem('sf_persist'); } catch(e){} window.location.reload(); }

  if(ENFORCE_LOGIN && !isLogged()){ goLogin(true); return; }

  // create node for header area
  function makeNode(){
    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.alignItems = 'center';
    wrap.style.gap = '10px';
    wrap.style.marginLeft = '12px';
    wrap.style.fontFamily = 'inherit';

    if(isLogged()){
      // show pill + sign out
      const email = (getEmail() || '').trim();
      const prefix = email ? email.split('@')[0] : 'guest';

      const pill = document.createElement('div');
      pill.title = email || 'guest';
      pill.style.display='inline-flex';
      pill.style.alignItems='center';
      pill.style.gap='8px';
      pill.style.padding='6px 10px';
      pill.style.borderRadius='999px';
      pill.style.background='rgba(255,255,255,0.03)';
      pill.style.border='1px solid rgba(255,255,255,0.04)';
      pill.style.color='rgba(230,238,248,0.95)';
      pill.style.fontWeight='700';
      pill.style.boxShadow='0 6px 18px rgba(0,0,0,0.16)';
      pill.style.maxWidth='180px';
      pill.style.overflow='hidden';
      pill.style.textOverflow='ellipsis';
      pill.style.whiteSpace='nowrap';

      const avatar = document.createElement('div');
      avatar.style.width='28px'; avatar.style.height='28px'; avatar.style.borderRadius='50%';
      avatar.style.display='inline-flex'; avatar.style.alignItems='center'; avatar.style.justifyContent='center';
      avatar.style.fontSize='12px'; avatar.style.fontWeight='800'; avatar.style.color='#02121a';
      avatar.style.background='linear-gradient(90deg,#3b82f6,#06b6d4)';
      avatar.textContent = prefix ? prefix[0].toUpperCase() : 'G';

      const name = document.createElement('div');
      name.textContent = prefix || 'guest';
      name.style.maxWidth='120px'; name.style.overflow='hidden'; name.style.textOverflow='ellipsis';

      pill.appendChild(avatar);
      pill.appendChild(name);
      wrap.appendChild(pill);

      const out = document.createElement('button');
      out.type='button'; out.textContent='Sign out'; out.setAttribute('aria-label','Sign out');
      out.style.padding='8px 12px'; out.style.borderRadius='8px'; out.style.border='0'; out.style.cursor='pointer';
      out.style.background='linear-gradient(90deg,#3b82f6,#06b6d4)'; out.style.color='#031827'; out.style.fontWeight='700';
      out.style.boxShadow='0 8px 24px rgba(3,7,18,0.18)';
      out.onclick = function(){
        try{ localStorage.removeItem(KEY_LOGGED); localStorage.removeItem(KEY_EMAIL); localStorage.removeItem('sf_persist'); }catch(e){}
        // optionally go to login
        window.location.href = LOGIN_PAGE;
      };
      wrap.appendChild(out);

    } else {
      // not logged: show User and Guest buttons
      const userBtn = document.createElement('button');
      userBtn.type='button'; userBtn.textContent='User'; userBtn.setAttribute('aria-label','Sign in');
      userBtn.style.padding='8px 12px'; userBtn.style.borderRadius='8px'; userBtn.style.border='1px solid rgba(255,255,255,0.06)';
      userBtn.style.background='transparent'; userBtn.style.color='rgba(230,238,248,0.95)'; userBtn.style.fontWeight='700';
      userBtn.onclick = function(){ goLogin(true); };

      const guestBtn = document.createElement('button');
      guestBtn.type='button'; guestBtn.textContent='Guest'; guestBtn.setAttribute('aria-label','Continue as guest');
      guestBtn.style.padding='8px 12px'; guestBtn.style.borderRadius='8px'; guestBtn.style.border='0';
      guestBtn.style.background='linear-gradient(90deg,#3b82f6,#06b6d4)'; guestBtn.style.color='#031827'; guestBtn.style.fontWeight='700';
      guestBtn.style.boxShadow='0 8px 24px rgba(3,7,18,0.18)';
      guestBtn.onclick = function(){ signGuest(); };

      wrap.appendChild(userBtn);
      wrap.appendChild(guestBtn);
    }

    return wrap;
  }

  function attach(){
    const topbar = document.querySelector('.topbar .topbar-inner') || document.querySelector('.topbar .container') || document.querySelector('.topbar');
    const node = makeNode();
    if(topbar){
      const nav = topbar.querySelector('.nav') || topbar.querySelector('nav');
      if(nav){ nav.appendChild(node); return; }
      topbar.appendChild(node); return;
    }
    // fallback fixed widget top-right
    const fallback = document.createElement('div');
    fallback.style.position='fixed'; fallback.style.top='12px'; fallback.style.right='12px'; fallback.style.zIndex='9999';
    fallback.style.display='flex'; fallback.style.alignItems='center'; fallback.style.gap='8px';
    fallback.style.padding='8px'; fallback.style.borderRadius='10px'; fallback.style.backdropFilter='blur(6px)';
    fallback.style.background='rgba(3,7,18,0.6)'; fallback.style.border='1px solid rgba(255,255,255,0.04)';
    try{ fallback.appendChild(node); document.body.appendChild(fallback); }catch(e){ console.warn('auth-snippet: fallback failed', e); }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach); else attach();

})();
