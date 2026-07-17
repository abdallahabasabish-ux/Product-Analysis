/**
 * subscribers.js – إدارة المشتركين مع بيانات حقيقية من Firestore
 * الإصدار: 2.0.0 (نهائي)
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
  const searchInput = document.getElementById('searchInput');
  const filterStatus = document.getElementById('filterStatus');
  const filterDevice = document.getElementById('filterDevice');
  const filterSite = document.getElementById('filterSite');
  const exportBtn = document.getElementById('exportBtn');
  const selectAll = document.getElementById('selectAll');
  const tableBody = document.getElementById('subscribersTableBody');

  let currentUser = null;
  let subscribersData = [];
  let filteredData = [];

  // ==========================================================
  // 1. التحقق من Firebase والمصادقة
  // ==========================================================
  if (typeof firebase === 'undefined') {
    loadingOverlay.innerHTML = '<div style="color:red;text-align:center;"><i class="fas fa-exclamation-triangle" style="font-size:32px;"></i><br>لم يتم تحميل Firebase. تأكد من إعداداتك.</div>';
    return;
  }

  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      currentUser = user;
      const displayName = user.displayName || user.email || 'مستخدم';
      const email = user.email || '';
      userName.textContent = displayName;
      userEmail.textContent = email;
      userAvatar.textContent = displayName.charAt(0).toUpperCase();
      loadingOverlay.style.display = 'none';

      // تحميل المشتركين الحقيقيين من Firestore
      loadSubscribers(user.uid);
      loadSubscriberStats(user.uid);
    } else {
      window.location.href = 'login.html';
    }
  });

  // ==========================================================
  // 2. تحميل المشتركين من Firestore
  // ==========================================================
  async function loadSubscribers(userId) {
    try {
      const snapshot = await db.collection('subscribers')
        .where('userId', '==', userId)
        .orderBy('subscribedAt', 'desc')
        .get();

      subscribersData = [];
      snapshot.forEach(doc => {
        subscribersData.push({ id: doc.id, ...doc.data() });
      });

      // تحميل أسماء المواقع المرتبطة
      await loadSiteNames();
      applyFilters();

    } catch (error) {
      console.error('❌ خطأ في تحميل المشتركين:', error);
      tableBody.innerHTML = `
        <tr><td colspan="8" style="text-align:center; padding:40px 0; color:var(--color-danger);">
          <i class="fas fa-exclamation-triangle" style="font-size:28px; display:block; margin-bottom:8px;"></i>
          حدث خطأ أثناء تحميل المشتركين
        </td></tr>
      `;
    }
  }

  // ==========================================================
  // 3. تحميل أسماء المواقع
  // ==========================================================
  async function loadSiteNames() {
    if (!currentUser) return;
    try {
      const snapshot = await db.collection('websites')
        .where('userId', '==', currentUser.uid)
        .get();
      const siteMap = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        siteMap[data.siteId] = data.siteName || data.siteUrl || 'موقع غير مسمى';
      });
      // تحديث بيانات المشتركين بأسماء المواقع
      subscribersData = subscribersData.map(sub => ({
        ...sub,
        siteName: siteMap[sub.siteId] || 'غير معروف'
      }));
    } catch (error) {
      console.warn('⚠️ لم نتمكن من تحميل أسماء المواقع:', error);
    }
  }

  // ==========================================================
  // 4. تحميل إحصائيات المشتركين
  // ==========================================================
  async function loadSubscriberStats(userId) {
    try {
      const snapshot = await db.collection('subscribers')
        .where('userId', '==', userId)
        .get();

      let total = 0;
      let active = 0;
      let recent = 0;
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);

      snapshot.forEach(doc => {
        const data = doc.data();
        total++;
        if (data.status === 'active') active++;
        const date = data.subscribedAt?.toDate() || data.createdAt?.toDate() || new Date();
        if (date >= thirtyDaysAgo) recent++;
      });

      // تحديث بطاقات الإحصائيات
      const statNumbers = document.querySelectorAll('.subscriber-stat .stat-number');
      if (statNumbers.length >= 4) {
        statNumbers[0].textContent = total.toLocaleString('ar-EG');
        statNumbers[1].textContent = active.toLocaleString('ar-EG');
        statNumbers[2].textContent = recent.toLocaleString('ar-EG');
        statNumbers[3].textContent = Math.round((active / total) * 100) + '٪';
      }

    } catch (error) {
      console.error('❌ خطأ في تحميل الإحصائيات:', error);
    }
  }

  // ==========================================================
  // 5. تطبيق الفلاتر والبحث
  // ==========================================================
  function applyFilters() {
    const search = searchInput.value.toLowerCase().trim();
    const status = filterStatus.value;
    const device = filterDevice.value;
    const site = filterSite.value;

    filteredData = subscribersData.filter(sub => {
      let match = true;
      const fullText = (sub.email || '') + ' ' + (sub.siteName || '') + ' ' + (sub.device || '') + ' ' + (sub.browser || '');
      
      if (search && !fullText.toLowerCase().includes(search)) match = false;
      if (status !== 'all' && sub.status !== status) match = false;
      if (device !== 'all') {
        const deviceMap = { 'mobile': 'mobile', 'desktop': 'desktop', 'tablet': 'tablet' };
        if (!(sub.device || '').includes(deviceMap[device])) match = false;
      }
      if (site !== 'all' && sub.siteId !== site) match = false;
      
      return match;
    });

    renderTable();
    updatePagination();
  }

  // ==========================================================
  // 6. عرض الجدول
  // ==========================================================
  function renderTable() {
    if (filteredData.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center; padding:40px 0; color:var(--color-mid);">
            <i class="fas fa-user-slash" style="font-size:28px; display:block; margin-bottom:8px;"></i>
            لا يوجد مشتركين مطابقين للبحث
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    const displayData = filteredData.slice(0, 20); // عرض 20 فقط للسرعة

    displayData.forEach(sub => {
      const statusClass = sub.status === 'active' ? 'active' : 'inactive';
      const statusText = sub.status === 'active' ? 'نشط' : 'غير نشط';
      const deviceIcon = sub.device?.includes('mobile') ? 'fa-mobile-alt' : 
                         sub.device?.includes('tablet') ? 'fa-tablet-alt' : 'fa-desktop';
      const deviceDisplay = sub.device || 'غير معروف';
      const date = sub.subscribedAt?.toDate() || sub.createdAt?.toDate() || new Date();
      const dateStr = date.toLocaleDateString('ar-EG');

      html += `
        <tr>
          <td class="checkbox-col"><input type="checkbox" class="subscriber-check" data-id="${sub.id}"></td>
          <td>
            <div style="font-weight:600; color:var(--color-dark);">${sub.email || 'غير معروف'}</div>
            <div style="font-size:13px; color:var(--color-mid);">${sub.name || '—'}</div>
          </td>
          <td>${sub.siteName || 'غير معروف'}</td>
          <td><span class="device-badge"><i class="fas ${deviceIcon}"></i> ${deviceDisplay}</span></td>
          <td>${sub.browser || '—'}</td>
          <td><span class="status-badge ${statusClass}">${statusText}</span></td>
          <td>${dateStr}</td>
          <td>
            <button class="btn-sm" style="background:none; border:none; color:var(--color-mid); cursor:pointer;" title="عرض التفاصيل"><i class="fas fa-eye"></i></button>
            <button class="btn-sm" style="background:none; border:none; color:var(--color-danger); cursor:pointer;" title="حذف" onclick="deleteSubscriber('${sub.id}')"><i class="fas fa-trash-alt"></i></button>
          </td>
        </tr>
      `;
    });

    tableBody.innerHTML = html;
  }

  // ==========================================================
  // 7. تحديث الترقيم
  // ==========================================================
  function updatePagination() {
    const pagination = document.querySelector('.pagination');
    if (!pagination) return;
    const total = filteredData.length;
    const showing = Math.min(total, 20);
    pagination.innerHTML = `
      <span>عرض ١-${showing} من ${total.toLocaleString('ar-EG')} مشترك</span>
      <div class="pages">
        <button class="active">١</button>
        ${total > 20 ? `<button>٢</button><button>٣</button><button>...</button><button>${Math.ceil(total/20)}</button>` : ''}
      </div>
    `;
  }

  // ==========================================================
  // 8. حذف مشترك
  // ==========================================================
  window.deleteSubscriber = async function(docId) {
    if (!confirm('هل أنت متأكد من حذف هذا المشترك؟')) return;
    try {
      await db.collection('subscribers').doc(docId).delete();
      showToast('✅ تم حذف المشترك بنجاح', 'success');
      await loadSubscribers(currentUser.uid);
    } catch (error) {
      console.error('❌ خطأ في الحذف:', error);
      showToast('حدث خطأ أثناء حذف المشترك', 'error');
    }
  };

  // ==========================================================
  // 9. تحديد الكل
  // ==========================================================
  selectAll.addEventListener('change', function() {
    const checkboxes = tableBody.querySelectorAll('.subscriber-check');
    checkboxes.forEach(cb => cb.checked = selectAll.checked);
  });

  // ==========================================================
  // 10. تصدير CSV
  // ==========================================================
  exportBtn.addEventListener('click', function() {
    if (filteredData.length === 0) {
      showToast('لا يوجد مشتركين للتصدير', 'warning');
      return;
    }

    let csv = 'البريد الإلكتروني,الاسم,الموقع,الجهاز,المتصفح,الحالة,تاريخ الاشتراك\n';
    filteredData.forEach(sub => {
      const date = sub.subscribedAt?.toDate() || sub.createdAt?.toDate() || new Date();
      csv += `${sub.email || ''},${sub.name || ''},${sub.siteName || ''},${sub.device || ''},${sub.browser || ''},${sub.status || ''},${date.toLocaleDateString('ar-EG')}\n`;
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subscribers_' + new Date().toISOString().split('T')[0] + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ تم تصدير ' + filteredData.length + ' مشترك', 'success');
  });

  // ==========================================================
  // 11. ربط الفلاتر والبحث
  // ==========================================================
  searchInput.addEventListener('input', applyFilters);
  filterStatus.addEventListener('change', applyFilters);
  filterDevice.addEventListener('change', applyFilters);
  filterSite.addEventListener('change', applyFilters);

  // تحديث قائمة المواقع في الفلتر
  async function updateSiteFilter() {
    if (!currentUser) return;
    try {
      const snapshot = await db.collection('websites')
        .where('userId', '==', currentUser.uid)
        .get();
      const select = document.getElementById('filterSite');
      // الاحتفاظ بخيار "جميع المواقع"
      const allOption = select.querySelector('option[value="all"]');
      select.innerHTML = '';
      select.appendChild(allOption);
      snapshot.forEach(doc => {
        const data = doc.data();
        const option = document.createElement('option');
        option.value = data.siteId || doc.id;
        option.textContent = data.siteName || data.siteUrl || 'موقع غير مسمى';
        select.appendChild(option);
      });
    } catch (error) {
      console.warn('⚠️ لم نتمكن من تحميل المواقع للفلتر:', error);
    }
  }

  // ==========================================================
  // 12. دوال مساعدة: Toast
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

  // ==========================================================
  // 13. تفعيل القائمة الجانبية (للجوال)
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
  // 14. قائمة المستخدم (تسجيل الخروج)
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

  // ==========================================================
  // 15. التهيئة النهائية
  // ==========================================================
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      setTimeout(updateSiteFilter, 500);
    }
  });

  console.log('✅ صفحة المشتركين جاهزة (بيانات حقيقية)');
});
