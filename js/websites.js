/**
 * websites.js – إدارة المواقع (نسخة نهائية تعمل 100%)
 * الإصدار: 3.1.0
 */

document.addEventListener('DOMContentLoaded', function() {

  console.log('✅ websites.js loaded');

  // ==========================================================
  // عناصر الصفحة
  // ==========================================================
  const loadingOverlay = document.getElementById('loadingOverlay');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const menuToggle = document.getElementById('menuToggle');
  const userAvatar = document.getElementById('userAvatar');
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  const logoutBtn = document.getElementById('logoutBtn');
  const userCard = document.getElementById('userCard');
  const logoutMenu = document.getElementById('logoutMenu');
  const addForm = document.getElementById('addWebsiteForm');
  const siteUrlInput = document.getElementById('siteUrlInput');
  const siteNameInput = document.getElementById('siteNameInput');
  const urlError = document.getElementById('urlError');
  const websitesContainer = document.getElementById('websitesContainer');
  const countSpan = document.getElementById('websitesCount');
  const lastUpdateSpan = document.getElementById('lastUpdate');

  let currentUser = null;
  let websitesData = [];

  // ==========================================================
  // 1. التحقق من Firebase
  // ==========================================================
  if (typeof firebase === 'undefined') {
    loadingOverlay.innerHTML = '<div style="color:red;text-align:center;padding:50px;">❌ لم يتم تحميل Firebase</div>';
    return;
  }

  const db = window.db || firebase.firestore();
  if (!db) {
    loadingOverlay.innerHTML = '<div style="color:red;text-align:center;padding:50px;">❌ فشل تهيئة Firestore</div>';
    return;
  }
  window.db = db;

  // ==========================================================
  // 2. المصادقة – الأهم: تأكد من أن المستخدم مسجل
  // ==========================================================
  firebase.auth().onAuthStateChanged(async function(user) {
    console.log('🔐 Auth state changed:', user ? user.email : 'no user');
    
    if (user) {
      currentUser = user;
      const displayName = user.displayName || user.email || 'مستخدم';
      const email = user.email || '';
      
      // تحديث واجهة المستخدم
      userName.textContent = displayName;
      userEmail.textContent = email;
      userAvatar.textContent = displayName.charAt(0).toUpperCase();
      
      // إخفاء التحميل
      loadingOverlay.style.display = 'none';
      
      // تحميل المواقع
      console.log('📡 جاري تحميل المواقع للمستخدم:', user.uid);
      await loadWebsites(user.uid);
      
    } else {
      console.log('🔴 غير مسجل دخول، التوجيه إلى login');
      window.location.href = 'login.html';
    }
  });

  // ==========================================================
  // 3. تحميل المواقع من Firestore (بدون orderBy)
  // ==========================================================
  async function loadWebsites(userId) {
    console.log('📡 loadWebsites() بدأت للمستخدم:', userId);
    
    try {
      // جلب المستندات من مجموعة websites
      const snapshot = await db.collection('websites')
        .where('userId', '==', userId)
        .get();

      console.log('📊 عدد المستندات التي تم جلبها:', snapshot.size);

      websitesData = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        console.log('📄 مستند:', doc.id, data);
        websitesData.push({ id: doc.id, ...data });
      });

      // ترتيب في الذاكرة
      websitesData.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });

      // عرض المواقع
      renderWebsites();
      updateLastUpdate();

    } catch (error) {
      console.error('❌ خطأ في تحميل المواقع:', error);
      
      // عرض رسالة خطأ واضحة مع تفاصيل
      websitesContainer.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1; text-align:center; padding:40px 20px; color:var(--color-mid);">
          <i class="fas fa-exclamation-triangle" style="font-size:48px; color:#EF4444; margin-bottom:16px; display:block;"></i>
          <h3 style="font-size:20px; color:#1A1A2E;">فشل تحميل المواقع</h3>
          <p style="color:#4A4A5A; margin-bottom:8px;">${error.message || 'حدث خطأ غير معروف'}</p>
          <p style="font-size:14px; color:#4A4A5A; margin-bottom:16px;">
            تأكد من:<br>
            • أنك متصل بالإنترنت<br>
            • أن Firestore مفعّل<br>
            • أن قواعد الأمان تسمح بالقراءة
          </p>
          <button onclick="location.reload()" class="btn btn-primary" style="display:inline-flex; padding:10px 24px; border-radius:10px; background:#1A1A2E; color:#fff; border:none; cursor:pointer;">
            <i class="fas fa-sync-alt"></i> إعادة المحاولة
          </button>
        </div>
      `;
      
      if (countSpan) countSpan.innerHTML = '<i class="fas fa-list" style="margin-left:8px;"></i> مواقعك (—)';
    }
  }

  // ==========================================================
  // 4. عرض المواقع
  // ==========================================================
  function renderWebsites() {
    console.log('🎨 renderWebsites() – عدد المواقع:', websitesData.length);
    
    if (!websitesContainer) return;

    if (websitesData.length === 0) {
      websitesContainer.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1; text-align:center; padding:40px 20px; color:var(--color-mid);">
          <i class="fas fa-globe" style="font-size:48px; color:#A0A0B0; margin-bottom:16px; display:block;"></i>
          <h3 style="font-size:20px; color:#1A1A2E;">لا توجد مواقع</h3>
          <p style="color:#4A4A5A;">أضف موقعك الأول للبدء في جمع المشتركين</p>
        </div>
      `;
      if (countSpan) countSpan.innerHTML = '<i class="fas fa-list" style="margin-left:8px;"></i> مواقعك (٠)';
      return;
    }

    let html = '';
    websitesData.forEach((site) => {
      const statusClass = site.verified ? 'verified' : (site.status === 'pending' ? 'pending' : 'failed');
      const statusText = site.verified ? 'موثق' : (site.status === 'pending' ? 'قيد الانتظار' : 'فشل التحقق');
      const statusIcon = site.verified ? 'fa-check-circle' : (site.status === 'pending' ? 'fa-clock' : 'fa-times-circle');
      const siteId = site.siteId || site.id.substring(0, 8);

      html += `
        <div class="website-card" data-id="${site.id}">
          <div class="site-header">
            <div>
              <div class="site-name">${site.siteName || 'موقع غير مسمى'}</div>
              <div class="site-url">${site.siteUrl ? site.siteUrl.replace(/^https?:\/\//, '') : '—'}</div>
            </div>
            <span class="site-status ${statusClass}"><i class="fas ${statusIcon}"></i> ${statusText}</span>
          </div>
          <div class="site-stats">
            <div class="stat-item"><span class="number">${site.subscriberCount || 0}</span> <span class="label">مشترك</span></div>
            <div class="stat-item"><span class="number">${site.campaignCount || 0}</span> <span class="label">حملة</span></div>
            <div class="stat-item"><span class="number">${site.ctr || '—'}</span> <span class="label">نسبة النقر</span></div>
          </div>
          <div class="site-actions">
            <button class="btn-sm" onclick="window.toggleCode('${site.id}')"><i class="fas fa-code"></i> كود التثبيت</button>
            <button class="btn-sm" onclick="window.verifyWebsite('${site.id}')"><i class="fas fa-shield-alt"></i> تحقق</button>
            <button class="btn-sm danger" onclick="window.deleteWebsite('${site.id}')"><i class="fas fa-trash-alt"></i> حذف</button>
          </div>
          <div id="code-${site.id}" class="code-snippet" style="display:none;">
            &lt;script src="https://cdn.blogpush.com/sdk.js" data-site-id="${siteId}"&gt;&lt;/script&gt;
            <button class="copy-btn" onclick="window.copyToClipboard(this, '&lt;script src=&quot;https://cdn.blogpush.com/sdk.js&quot; data-site-id=&quot;${siteId}&quot;&gt;&lt;/script&gt;')">نسخ</button>
          </div>
        </div>
      `;
    });

    websitesContainer.innerHTML = html;
    if (countSpan) countSpan.innerHTML = `<i class="fas fa-list" style="margin-left:8px;"></i> مواقعك (${websitesData.length})`;
  }

  // ==========================================================
  // 5. تحديث وقت آخر تحديث
  // ==========================================================
  function updateLastUpdate() {
    if (lastUpdateSpan) {
      const now = new Date();
      lastUpdateSpan.textContent = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    }
  }

  // ==========================================================
  // 6. إضافة موقع
  // ==========================================================
  addForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const url = siteUrlInput.value.trim();
    const name = siteNameInput.value.trim() || 'موقع جديد';

    if (!url) {
      urlError.classList.add('show');
      return;
    }
    urlError.classList.remove('show');

    const btn = document.getElementById('addSiteBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإضافة...';

    try {
      const siteId = Math.random().toString(36).substring(2, 10).toUpperCase();
      const secretKey = Math.random().toString(36).substring(2, 34);

      await db.collection('websites').add({
        userId: currentUser.uid,
        siteUrl: url,
        siteName: name,
        siteId: 'BP-' + siteId,
        secretKey: secretKey,
        verified: false,
        status: 'pending',
        subscriberCount: 0,
        campaignCount: 0,
        ctr: '—',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      await loadWebsites(currentUser.uid);
      siteUrlInput.value = '';
      siteNameInput.value = '';
      showToast('✅ تم إضافة الموقع بنجاح!', 'success');

    } catch (error) {
      console.error('❌ خطأ في الإضافة:', error);
      showToast('❌ ' + error.message, 'error');
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-plus"></i> إضافة';
  });

  siteUrlInput.addEventListener('input', function() {
    urlError.classList.remove('show');
  });

  // ==========================================================
  // 7. دوال الأزرار العامة
  // ==========================================================
  window.deleteWebsite = async function(docId) {
    if (!currentUser) { showToast('الرجاء تسجيل الدخول أولاً', 'error'); return; }
    if (!confirm('⚠️ هل أنت متأكد من حذف هذا الموقع؟ سيتم حذف جميع بياناته.')) return;
    try {
      await db.collection('websites').doc(docId).delete();
      showToast('✅ تم الحذف', 'success');
      await loadWebsites(currentUser.uid);
    } catch (error) {
      showToast('❌ ' + error.message, 'error');
    }
  };

  // ==========================================================
  // التحقق الفعلي من الموقع عبر الميتا تاج
  // ==========================================================
  window.verifyWebsite = async function(docId) {
    if (!currentUser) {
      showToast('الرجاء تسجيل الدخول أولاً', 'error');
      return;
    }

    // 1. جلب بيانات الموقع من Firestore
    const siteDoc = await db.collection('websites').doc(docId).get();
    if (!siteDoc.exists) {
      showToast('الموقع غير موجود', 'error');
      return;
    }
    const siteData = siteDoc.data();
    const siteUrl = siteData.siteUrl;
    const siteId = siteData.siteId; // مثلاً: BP-7X9K2M

    if (!siteUrl) {
      showToast('رابط الموقع غير صحيح', 'error');
      return;
    }

    showToast('⏳ جاري التحقق الفعلي من الموقع...', 'info');

    try {
      // 2. استخدام وكيل CORS لجلب محتوى الموقع
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(siteUrl)}`;
      const response = await fetch(proxyUrl);
      const result = await response.json();

      if (!result.contents) {
        showToast('تعذر الوصول إلى الموقع. تأكد من الرابط.', 'error');
        return;
      }

      const html = result.contents;

      // 3. البحث عن ميتا تاج التحقق في الـ HTML
      // صيغة البحث: <meta name="blogpush-verification" content="BP-XXXXXX" />
      const metaRegex1 = new RegExp(
        `<meta[^>]*name=["']blogpush-verification["'][^>]*content=["']${siteId}["'][^>]*>`,
        'i'
      );
      const metaRegex2 = new RegExp(
        `<meta[^>]*content=["']${siteId}["'][^>]*name=["']blogpush-verification["'][^>]*>`,
        'i'
      );

      const isVerified = metaRegex1.test(html) || metaRegex2.test(html);

      // 4. تحديث حالة الموقع في Firestore بناءً على النتيجة
      if (isVerified) {
        await db.collection('websites').doc(docId).update({
          verified: true,
          status: 'active',
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('✅ تم التحقق بنجاح! (تم العثور على ميتا تاج)', 'success');
      } else {
        // إذا لم يتم العثور على الميتا تاج، نضع الحالة "فشل التحقق"
        await db.collection('websites').doc(docId).update({
          verified: false,
          status: 'failed',
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast('❌ فشل التحقق. لم يتم العثور على ميتا تاج التحقق في الموقع.', 'error');
      }

      // 5. إعادة تحميل القائمة لتحديث الواجهة
      await loadWebsites(currentUser.uid);

    } catch (error) {
      console.error('❌ خطأ في التحقق:', error);
      showToast('❌ فشل التحقق: ' + error.message, 'error');
    }
  };

  window.toggleCode = function(id) {
    const el = document.getElementById('code-' + id);
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
  };

  window.copyToClipboard = function(btn, text) {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = '✅ تم!';
        setTimeout(() => btn.textContent = 'نسخ', 2000);
      }).catch(() => fallbackCopy(btn, text));
    } else {
      fallbackCopy(btn, text);
    }
  };

  function fallbackCopy(btn, text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      btn.textContent = '✅ تم!';
      setTimeout(() => btn.textContent = 'نسخ', 2000);
    } catch(e) {
      showToast('فشل النسخ، حاول يدوياً', 'error');
    }
    document.body.removeChild(ta);
  }

  // ==========================================================
  // 8. Toast
  // ==========================================================
  function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      const c = document.createElement('div');
      c.id = 'toast-container';
      c.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:12px;max-width:380px;width:100%;pointer-events:none;';
      document.body.appendChild(c);
      container = c;
    }
    const colors = { success: '#10B981', error: '#EF4444', info: '#3B82F6', warning: '#F59E0B' };
    const toast = document.createElement('div');
    toast.style.cssText = `
      padding:14px 20px;border-radius:12px;color:#fff;
      background:${colors[type] || colors.info};
      box-shadow:0 8px 25px rgba(0,0,0,0.15);
      font-size:15px;font-weight:500;
      opacity:0;transform:translateX(30px);
      transition:all 0.35s cubic-bezier(0.25,0.46,0.45,0.94);
      pointer-events:auto;direction:rtl;text-align:right;
      border:1px solid rgba(255,255,255,0.2);
    `;
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    });
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(30px)';
      setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 350);
    }, 4000);
  }
  window.showToast = showToast;

  // ==========================================================
  // 9. القائمة الجانبية والخروج
  // ==========================================================
  function toggleSidebar(open) {
    if (open) { sidebar.classList.add('open'); sidebarOverlay.classList.add('open'); }
    else { sidebar.classList.remove('open'); sidebarOverlay.classList.remove('open'); }
  }
  menuToggle.addEventListener('click', () => toggleSidebar(!sidebar.classList.contains('open')));
  sidebarOverlay.addEventListener('click', () => toggleSidebar(false));

  userCard.addEventListener('click', () => {
    logoutMenu.style.display = logoutMenu.style.display === 'block' ? 'none' : 'block';
  });
  document.addEventListener('click', (e) => {
    if (!userCard.contains(e.target) && !logoutMenu.contains(e.target)) {
      logoutMenu.style.display = 'none';
    }
  });
  logoutBtn.addEventListener('click', () => {
    firebase.auth().signOut().then(() => window.location.href = 'login.html');
  });

  console.log('✅ صفحة المواقع جاهزة (نسخة 3.1.0)');
});
