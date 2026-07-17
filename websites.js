/**
 * websites.js – التحكم في إدارة المواقع
 * الإصدار: 1.0.0
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

  // ==========================================================
  // 1. التحقق من Firebase والمصادقة
  // ==========================================================
  if (typeof firebase === 'undefined') {
    loadingOverlay.innerHTML = '<div style="color:red;text-align:center;"><i class="fas fa-exclamation-triangle" style="font-size:32px;"></i><br>لم يتم تحميل Firebase. تأكد من إعداداتك.</div>';
    return;
  }

  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      const displayName = user.displayName || user.email || 'مستخدم';
      const email = user.email || '';
      userName.textContent = displayName;
      userEmail.textContent = email;
      userAvatar.textContent = displayName.charAt(0).toUpperCase();
      loadingOverlay.style.display = 'none';
      loadWebsites(user.uid);
    } else {
      window.location.href = 'login.html';
    }
  });

  // ==========================================================
  // 2. تحميل المواقع من Firestore (محاكاة)
  // ==========================================================
  function loadWebsites(userId) {
    console.log('🌐 جاري تحميل مواقع المستخدم:', userId);
    // في الإنتاج، استخدم:
    // const snapshot = await firebase.firestore().collection('websites').where('userId', '==', userId).get();
    // ثم قم بتحديث واجهة المستخدم
  }

  // ==========================================================
  // 3. نسخ كود التثبيت
  // ==========================================================
  window.copyCode = function(id) {
    const el = document.getElementById('code-' + id);
    if (el) {
      el.style.display = (el.style.display === 'none' || el.style.display === '') ? 'block' : 'none';
    }
  };

  // ==========================================================
  // 4. نسخ النص إلى الحافظة
  // ==========================================================
  window.copyToClipboard = function(btn, text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() {
        btn.textContent = 'تم!';
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
    document.execCommand('copy');
    document.body.removeChild(textarea);
    btn.textContent = 'تم!';
    setTimeout(function() { btn.textContent = 'نسخ'; }, 2000);
  }

  // ==========================================================
  // 5. إضافة موقع جديد
  // ==========================================================
  addForm.addEventListener('submit', function(e) {
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

    // محاكاة الإضافة إلى Firestore
    setTimeout(function() {
      const container = document.getElementById('websitesContainer');
      const newCard = document.createElement('div');
      newCard.className = 'website-card';
      newCard.innerHTML = `
        <div class="site-header">
          <div>
            <div class="site-name">${name}</div>
            <div class="site-url">${url.replace(/^https?:\/\//, '')}</div>
          </div>
          <span class="site-status pending"><i class="fas fa-clock"></i> قيد الانتظار</span>
        </div>
        <div class="site-stats">
          <div class="stat-item"><span class="number">٠</span> <span class="label">مشترك</span></div>
          <div class="stat-item"><span class="number">٠</span> <span class="label">حملة</span></div>
          <div class="stat-item"><span class="number">—</span> <span class="label">نسبة النقر</span></div>
        </div>
        <div class="site-actions">
          <button class="btn-sm"><i class="fas fa-shield-alt"></i> تحقق</button>
          <button class="btn-sm"><i class="fas fa-code"></i> كود التثبيت</button>
          <button class="btn-sm danger"><i class="fas fa-trash-alt"></i> حذف</button>
        </div>
      `;
      container.prepend(newCard);

      siteUrlInput.value = '';
      siteNameInput.value = '';
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-plus"></i> إضافة';

      const countSpan = document.querySelector('.main-content h3');
      if (countSpan) {
        const currentCount = container.children.length;
        countSpan.textContent = `مواقعك (${currentCount})`;
      }

      alert('✅ تم إضافة الموقع بنجاح!');
    }, 1500);
  });

  siteUrlInput.addEventListener('input', function() {
    urlError.classList.remove('show');
  });

  // ==========================================================
  // 6. تفعيل القائمة الجانبية (للجوال)
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
  // 7. قائمة المستخدم (تسجيل الخروج)
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
    }).catch(function(error) {
      alert('حدث خطأ أثناء تسجيل الخروج: ' + error.message);
    });
  });

  console.log('✅ صفحة إدارة المواقع جاهزة');
});
