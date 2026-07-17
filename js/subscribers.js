/**
 * subscribers.js – التحكم في إدارة المشتركين
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
  const searchInput = document.getElementById('searchInput');
  const filterStatus = document.getElementById('filterStatus');
  const filterDevice = document.getElementById('filterDevice');
  const filterSite = document.getElementById('filterSite');
  const exportBtn = document.getElementById('exportBtn');
  const selectAll = document.getElementById('selectAll');
  const tableBody = document.getElementById('subscribersTableBody');

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
      loadSubscribers(user.uid);
    } else {
      window.location.href = 'login.html';
    }
  });

  // ==========================================================
  // 2. تحميل المشتركين من Firestore (محاكاة)
  // ==========================================================
  function loadSubscribers(userId) {
    console.log('👥 جاري تحميل المشتركين للمستخدم:', userId);
    // في الإنتاج، استخدم:
    // const snapshot = await firebase.firestore().collection('subscribers').where('userId', '==', userId).get();
    // ثم قم بتحديث واجهة المستخدم
  }

  // ==========================================================
  // 3. البحث والتصفية
  // ==========================================================
  function filterTable() {
    const search = searchInput.value.toLowerCase().trim();
    const status = filterStatus.value;
    const device = filterDevice.value;
    const site = filterSite.value;
    const rows = tableBody.querySelectorAll('tr');

    rows.forEach(function(row) {
      const text = row.textContent.toLowerCase();
      const rowStatus = row.querySelector('.status-badge')?.textContent.trim() || '';
      const rowDevice = row.querySelector('.device-badge')?.textContent.trim() || '';
      const rowSite = row.querySelector('td:nth-child(3)')?.textContent.trim() || '';

      let show = true;
      if (search && !text.includes(search)) show = false;
      
      if (status !== 'all') {
        const statusMap = { 'active': 'نشط', 'inactive': 'غير نشط' };
        if (rowStatus !== statusMap[status]) show = false;
      }
      
      if (device !== 'all') {
        const deviceMap = { 'mobile': 'هاتف', 'desktop': 'كمبيوتر', 'tablet': 'جهاز لوحي' };
        if (!rowDevice.includes(deviceMap[device])) show = false;
      }
      
      if (site !== 'all') {
        const siteMap = {
          'site1': 'مدونة التقنية',
          'site2': 'مدونة التسويق',
          'site3': 'مدونة السفر'
        };
        if (rowSite !== siteMap[site]) show = false;
      }
      
      row.style.display = show ? '' : 'none';
    });
  }

  searchInput.addEventListener('input', filterTable);
  filterStatus.addEventListener('change', filterTable);
  filterDevice.addEventListener('change', filterTable);
  filterSite.addEventListener('change', filterTable);

  // ==========================================================
  // 4. تحديد الكل (Checkbox)
  // ==========================================================
  selectAll.addEventListener('change', function() {
    const checkboxes = tableBody.querySelectorAll('.subscriber-check');
    checkboxes.forEach(function(cb) {
      cb.checked = selectAll.checked;
    });
  });

  // ==========================================================
  // 5. تصدير CSV (محاكاة)
  // ==========================================================
  exportBtn.addEventListener('click', function() {
    // في الإنتاج، قم بجمع البيانات من Firestore وإنشاء ملف CSV
    alert('📥 سيتم تصدير قائمة المشتركين كملف CSV. (سيتم تفعيل هذه الميزة قريباً)');
    
    // مثال لإنشاء CSV بسيط:
    /*
    const rows = tableBody.querySelectorAll('tr');
    let csv = 'الاسم,البريد,الموقع,الجهاز,المتصفح,الحالة,التاريخ\n';
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length > 0) {
        const name = cells[0]?.textContent.trim() || '';
        const site = cells[2]?.textContent.trim() || '';
        const device = cells[3]?.textContent.trim() || '';
        const browser = cells[4]?.textContent.trim() || '';
        const status = cells[5]?.textContent.trim() || '';
        const date = cells[6]?.textContent.trim() || '';
        csv += `${name},${site},${device},${browser},${status},${date}\n`;
      }
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subscribers.csv';
    a.click();
    URL.revokeObjectURL(url);
    */
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

  console.log('✅ صفحة المشتركين جاهزة');
});
