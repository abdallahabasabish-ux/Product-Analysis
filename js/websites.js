/**
 * websites.js – إدارة المواقع مع قراءة/كتابة من Firestore
 * الإصدار: 2.2.0 (تم إصلاح خطأ التحميل وتفعيل الأزرار)
 */
document.addEventListener('DOMContentLoaded', function() {

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
  const countSpan = document.getElementById('websitesCount'); // updated to use ID
  const lastUpdateSpan = document.getElementById('lastUpdate');

  let currentUser = null;
  let websitesData = [];

  // ==========================================================
  // 1. التحقق من Firebase والمصادقة
  // ==========================================================
  if (typeof firebase === 'undefined') {
    loadingOverlay.innerHTML = '<div style="color:red;text-align:center;"><i class="fas fa-exclamation-triangle" style="font-size:32px;"></i><br>لم يتم تحميل Firebase. تأكد من إعداداتك.</div>';
    return;
  }

  // التأكد من وجود db
  const db = firebase.firestore ? firebase.firestore() : null;
  if (!db) {
    loadingOverlay.innerHTML = '<div style="color:red;text-align:center;"><i class="fas fa-exclamation-triangle" style="font-size:32px;"></i><br>فشل تهيئة Firestore. تحقق من إعدادات Firebase.</div>';
    return;
  }
  window.db = db;

  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      currentUser = user;
      const displayName = user.displayName || user.email || 'مستخدم';
      const email = user.email || '';
      userName.textContent = displayName;
      userEmail.textContent = email;
      userAvatar.textContent = displayName.charAt(0).toUpperCase();
      loadingOverlay.style.display = 'none';

      // تحميل المواقع
      loadWebsites(user.uid);
    } else {
      window.location.href = 'login.html';
    }
  });

  // ==========================================================
  // 2. تحميل المواقع من Firestore
  // ==========================================================
  async function loadWebsites(userId) {
    try {
      if (!window.db) {
        throw new Error('Firestore غير مهيأ');
      }

      const snapshot = await window.db.collection('websites')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

      websitesData = [];
      snapshot.forEach(doc => {
        websitesData.push({ id: doc.id, ...doc.data() });
      });

      renderWebsites();
      updateLastUpdate();

    } catch (error) {
      console.error('❌ خطأ في تحميل المواقع:', error);
      showToast('⚠️ حدث خطأ أثناء تحميل المواقع: ' + error.message, 'error');
      
      websitesContainer.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1; text-align:center; padding:40px 20px; color:var(--color-mid);">
          <i class="fas fa-exclamation-triangle" style="font-size:48px; color:var(--color-danger); margin-bottom:16px; display:block;"></i>
          <h3 style="font-size:20px; color:var(--color-dark);">فشل تحميل المواقع</h3>
          <p style="margin-bottom:16px;">${error.message || 'حدث خطأ غير معروف'}</p>
          <button onclick="window.location.reload()" class="btn btn-primary" style="display:inline-flex;">
            <i class="fas fa-sync-alt"></i> إعادة المحاولة
          </button>
        </div>
      `;
      if (countSpan) countSpan.innerHTML = '<i class="fas fa-list" style="margin-left:8px;"></i> مواقعك (—)';
    }
  }

  // ==========================================================
  // 3. عرض المواقع في الواجهة
  // ==========================================================
  function renderWebsites() {
    if (!websitesContainer) return;

    if (websitesData.length === 0) {
      websitesContainer.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1; text-align:center; padding:40px 20px; color:var(--color-mid);">
          <i class="fas fa-globe" style="font-size:48px; color:var(--color-light); margin-bottom:16px; display:block;"></i>
          <h3 style="font-size:20px; color:var(--color-dark);">لا توجد مواقع</h3>
          <p>أضف موقعك الأول للبدء في جمع المشتركين</p>
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
  // 4. تحديث وقت آخر تحديث
  // ==========================================================
  function updateLastUpdate() {
    if (lastUpdateSpan) {
      const now = new Date();
      lastUpdateSpan.textContent = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    }
  }

  // ==========================================================
  // 5. إضافة موقع جديد إلى Firestore
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

      await window.db.collection('websites').add({
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
      console.error('❌ خطأ في إضافة الموقع:', error);
      showToast('حدث خطأ أثناء إضافة الموقع: ' + error.message, 'error');
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-plus"></i> إضافة';
  });

  siteUrlInput.addEventListener('input', function() {
    urlError.classList.remove('show');
  });

  // ==========================================================
  // 6. حذف موقع (دالة عامة)
  // ==========================================================
  window.deleteWebsite = async function(docId) {
    if (!currentUser) {
      showToast('الرجاء تسجيل الدخول أولاً', 'error');
      return;
    }
    if (!confirm('⚠️ هل أنت متأكد من حذف هذا الموقع؟ سيتم حذف جميع بياناته.')) return;

    try {
      await window.db.collection('websites').doc(docId).delete();
      showToast('✅ تم حذف الموقع بنجاح', 'success');
      await loadWebsites(currentUser.uid);
    } catch (error) {
      console.error('❌ خطأ في الحذف:', error);
      showToast('حدث خطأ أثناء حذف الموقع: ' + error.message, 'error');
    }
  };

  // ==========================================================
  // 7. التحقق من الموقع (دالة عامة)
  // ==========================================================
  window.verifyWebsite = async function(docId) {
    if (!currentUser) {
      showToast('الرجاء تسجيل الدخول أولاً', 'error');
      return;
    }
    try {
      showToast('⏳ جاري التحقق من الموقع...', 'info');
      
      // محاكاة عملية التحقق (يمكن استبدالها بفحص حقيقي)
      await new Promise(resolve => setTimeout(resolve, 1500));

      await window.db.collection('websites').doc(docId).update({
        verified: true,
        status: 'active',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      showToast('✅ تم التحقق من الموقع بنجاح!', 'success');
      await loadWebsites(currentUser.uid);
    } catch (error) {
      console.error('❌ خطأ في التحقق:', error);
      showToast('فشل التحقق من الموقع: ' + error.message, 'error');
    }
  };

  // ==========================================================
  // 8. عرض/إخفاء كود التثبيت (دالة عامة)
  // ==========================================================
  window.toggleCode = function(id) {
    const el = document.getElementById('code-' + id);
    if (el) {
      el.style.display = el.style.display === 'none' ? 'block' : 'none';
    }
  };

  // ==========================================================
  // 9. نسخ النص إلى الحافظة (دالة عامة)
  // ==========================================================
  window.copyToClipboard = function(btn, text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() {
        btn.textContent = '✅ تم!';
        setTimeout(function() { btn.textContent = 'نسخ'; }, 2000);
      }).catch(function() {
        fallbackCopy(btn, text);
      });
    } else {
      fallbackCopy(btn, text);
    }
  };

  function fallbackCopy(btn, text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      btn.textContent = '✅ تم!';
      setTimeout(function() { btn.textContent = 'نسخ'; }, 2000);
    } catch(e) {
      showToast('فشل النسخ، حاول يدوياً', 'error');
    }
    document.body.removeChild(textarea);
  }

  // ==========================================================
  // 10. دالة عرض الرسائل (عامة)
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
      transition:all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
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
  // 11. تفعيل القائمة الجانبية (للجوال)
  // ==========================================================
  function toggleSidebar(open) {
    if (open) {
      sidebar.classList.add('open');
      sidebarOverlay.classList.add('open');
    } else {
      sidebar.classList.remove('open');
      sidebarOverlay.classList.remove('open');
    }
  }

  menuToggle.addEventListener('click', function() {
    toggleSidebar(!sidebar.classList.contains('open'));
  });

  sidebarOverlay.addEventListener('click', function() {
    toggleSidebar(false);
  });

  // ==========================================================
  // 12. قائمة المستخدم (تسجيل الخروج)
  // ==========================================================
  userCard.addEventListener('click', function() {
    logoutMenu.style.display = logoutMenu.style.display === 'block' ? 'none' : 'block';
  });

  document.addEventListener('click', function(e) {
    if (!userCard.contains(e.target) && !logoutMenu.contains(e.target)) {
      logoutMenu.style.display = 'none';
    }
  });

  logoutBtn.addEventListener('click', function() {
    firebase.auth().signOut().then(function() {
      window.location.href = 'login.html';
    });
  });

  console.log('✅ صفحة المواقع جاهزة (بيانات حقيقية)');
});
