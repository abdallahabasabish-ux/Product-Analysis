/**
 * dashboard.js – التحكم في لوحة التحكم
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
  const greetingText = document.getElementById('greetingText');
  const dateText = document.getElementById('dateText');
  const logoutBtn = document.getElementById('logoutBtn');
  const userCard = document.getElementById('userCard');
  const logoutMenu = document.getElementById('logoutMenu');

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
      greetingText.textContent = 'مرحباً، ' + displayName + ' 👋';
      const now = new Date();
      dateText.textContent = now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      loadingOverlay.style.display = 'none';

      // تحميل الإحصائيات من Firestore
      loadDashboardStats(user.uid);
    } else {
      window.location.href = 'login.html';
    }
  });

  // ==========================================================
  // 2. تحميل الإحصائيات (محاكاة – يتم ربطها بـ Firestore لاحقاً)
  // ==========================================================
  function loadDashboardStats(userId) {
    // محاكاة جلب البيانات من Firestore
    // في الإنتاج، استخدم:
    // const doc = await firebase.firestore().collection('users').doc(userId).get();
    console.log('📊 جاري تحميل إحصائيات المستخدم:', userId);
    
    // تحديث الإحصائيات بالقيم الافتراضية
    document.getElementById('statSubscribers').textContent = '١٢,٨٤٧';
    document.getElementById('statWebsites').textContent = '٤';
    document.getElementById('statCampaigns').textContent = '٢٣';
    document.getElementById('statCtr').textContent = '٨.٧٪';
  }

  // ==========================================================
  // 3. المخططات (Charts)
  // ==========================================================
  function initCharts() {
    // مخطط نمو المشتركين
    const growthCtx = document.getElementById('growthChart');
    if (growthCtx) {
      new Chart(growthCtx, {
        type: 'line',
        data: {
          labels: ['الأسبوع ١', 'الأسبوع ٢', 'الأسبوع ٣', 'الأسبوع ٤', 'الأسبوع ٥', 'الأسبوع ٦'],
          datasets: [{
            label: 'المشتركين الجدد',
            data: [120, 190, 300, 250, 410, 520],
            borderColor: '#1A1A2E',
            backgroundColor: 'rgba(26, 26, 46, 0.05)',
            tension: 0.3,
            fill: true,
            pointBackgroundColor: '#1A1A2E',
            pointRadius: 4,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    // مخطط توزيع الأجهزة
    const deviceCtx = document.getElementById('deviceChart');
    if (deviceCtx) {
      new Chart(deviceCtx, {
        type: 'doughnut',
        data: {
          labels: ['الهواتف', 'الحواسيب', 'الأجهزة اللوحية', 'أخرى'],
          datasets: [{
            data: [55, 30, 10, 5],
            backgroundColor: ['#1A1A2E', '#4A4A5A', '#A0A0B0', '#E2E4E8'],
            borderWidth: 0,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                font: { family: 'Cairo', size: 13 },
                padding: 16,
                usePointStyle: true,
                pointStyle: 'circle'
              }
            }
          },
          cutout: '75%',
        }
      });
    }
  }

  // تشغيل المخططات بعد تحميل الصفحة
  setTimeout(initCharts, 500);

  // ==========================================================
  // 4. تفعيل القائمة الجانبية (للجوال)
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
  // 5. قائمة المستخدم (تسجيل الخروج)
  // ==========================================================
  userCard.addEventListener('click', function() {
    if (logoutMenu.style.display === 'block') {
      logoutMenu.style.display = 'none';
    } else {
      logoutMenu.style.display = 'block';
    }
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

  console.log('✅ لوحة التحكم جاهزة');
});
