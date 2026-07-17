/**
 * dashboard.js – لوحة التحكم مع بيانات حقيقية من Firestore
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

  let currentUser = null;

  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      currentUser = user;
      const displayName = user.displayName || user.email || 'مستخدم';
      const email = user.email || '';
      userName.textContent = displayName;
      userEmail.textContent = email;
      userAvatar.textContent = displayName.charAt(0).toUpperCase();
      greetingText.textContent = 'مرحباً، ' + displayName + ' 👋';
      const now = new Date();
      dateText.textContent = now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      loadingOverlay.style.display = 'none';

      // تحميل الإحصائيات الحقيقية من Firestore
      loadDashboardStats(user.uid);
      loadRecentCampaigns(user.uid);
    } else {
      window.location.href = 'login.html';
    }
  });

  // ==========================================================
  // 2. تحميل الإحصائيات من Firestore
  // ==========================================================
  async function loadDashboardStats(userId) {
    try {
      // جلب عدد المواقع
      const websitesSnapshot = await db.collection('websites')
        .where('userId', '==', userId)
        .get();
      const websitesCount = websitesSnapshot.size;

      // جلب عدد المشتركين
      const subscribersSnapshot = await db.collection('subscribers')
        .where('userId', '==', userId)
        .get();
      const subscribersCount = subscribersSnapshot.size;

      // جلب عدد الحملات
      const campaignsSnapshot = await db.collection('campaigns')
        .where('userId', '==', userId)
        .get();
      const campaignsCount = campaignsSnapshot.size;

      // تحديث واجهة المستخدم
      document.getElementById('statWebsites').textContent = websitesCount;
      document.getElementById('statSubscribers').textContent = subscribersCount.toLocaleString('ar-EG');
      document.getElementById('statCampaigns').textContent = campaignsCount;

      // حساب نسبة النقر (CTR) من الحملات المرسلة
      let totalOpens = 0;
      let totalDelivered = 0;
      campaignsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.status === 'sent') {
          totalOpens += data.opens || 0;
          totalDelivered += data.delivered || data.totalSubscribers || 0;
        }
      });
      const ctr = totalDelivered > 0 ? ((totalOpens / totalDelivered) * 100).toFixed(1) : '٠';
      document.getElementById('statCtr').textContent = ctr + '٪';

      console.log('✅ تم تحميل الإحصائيات:', { websitesCount, subscribersCount, campaignsCount, ctr });

    } catch (error) {
      console.error('❌ خطأ في تحميل الإحصائيات:', error);
      // استخدام القيم الافتراضية
      document.getElementById('statWebsites').textContent = '٠';
      document.getElementById('statSubscribers').textContent = '٠';
      document.getElementById('statCampaigns').textContent = '٠';
      document.getElementById('statCtr').textContent = '٠٪';
    }
  }

  // ==========================================================
  // 3. تحميل آخر الحملات من Firestore
  // ==========================================================
  async function loadRecentCampaigns(userId) {
    try {
      const campaignsSnapshot = await db.collection('campaigns')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(4)
        .get();

      const tbody = document.querySelector('.recent-table tbody');
      if (!tbody) return;

      if (campaignsSnapshot.empty) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align:center; padding:40px 0; color:var(--color-mid);">
              <i class="fas fa-inbox" style="font-size:28px; display:block; margin-bottom:8px;"></i>
              لا توجد حملات بعد. أنشئ حملتك الأولى!
            </td>
          </tr>
        `;
        return;
      }

      let html = '';
      campaignsSnapshot.forEach(doc => {
        const data = doc.data();
        const statusMap = {
          'sent': '<span class="status-badge success">مرسلة</span>',
          'scheduled': '<span class="status-badge warning">قيد الانتظار</span>',
          'draft': '<span class="status-badge draft">مسودة</span>',
          'failed': '<span class="status-badge danger">فشلت</span>'
        };
        const statusHtml = statusMap[data.status] || '<span class="status-badge">غير معروف</span>';
        const sentDate = data.sentAt ? new Date(data.sentAt.seconds * 1000).toLocaleDateString('ar-EG') : '—';
        const ctrDisplay = data.clicks && data.delivered ? ((data.clicks / data.delivered) * 100).toFixed(1) + '٪' : '—';
        
        html += `
          <tr>
            <td>${data.title || 'بدون عنوان'}</td>
            <td>${data.siteName || 'غير محدد'}</td>
            <td>${statusHtml}</td>
            <td>${ctrDisplay}</td>
            <td>${sentDate}</td>
          </tr>
        `;
      });

      tbody.innerHTML = html;

    } catch (error) {
      console.error('❌ خطأ في تحميل الحملات:', error);
    }
  }

  // ==========================================================
  // 4. المخططات (Charts) – تعرض بيانات حقيقية
  // ==========================================================
  async function loadCharts(userId) {
    try {
      // جلب بيانات المشتركين الشهرية
      const subscribersSnapshot = await db.collection('subscribers')
        .where('userId', '==', userId)
        .get();

      // تجميع المشتركين حسب الشهر
      const monthlyData = {};
      const now = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(now.getMonth() - 6);

      subscribersSnapshot.forEach(doc => {
        const data = doc.data();
        const date = data.subscribedAt?.toDate() || data.createdAt?.toDate() || new Date();
        if (date >= sixMonthsAgo) {
          const monthKey = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
          monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
        }
      });

      // ترتيب الأشهر
      const months = [];
      const counts = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        months.push(d.toLocaleDateString('ar-EG', { month: 'short' }));
        counts.push(monthlyData[key] || 0);
      }

      // رسم المخطط الخطي
      const growthCtx = document.getElementById('growthChart');
      if (growthCtx) {
        new Chart(growthCtx, {
          type: 'line',
          data: {
            labels: months,
            datasets: [{
              label: 'المشتركين الجدد',
              data: counts,
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

      // توزيع الأجهزة (حقيقي)
      const deviceData = { 'الهواتف': 0, 'الحواسيب': 0, 'الأجهزة اللوحية': 0, 'أخرى': 0 };
      subscribersSnapshot.forEach(doc => {
        const data = doc.data();
        const device = data.device || 'أخرى';
        if (device.includes('mobile') || device.includes('phone')) deviceData['الهواتف']++;
        else if (device.includes('desktop') || device.includes('computer')) deviceData['الحواسيب']++;
        else if (device.includes('tablet')) deviceData['الأجهزة اللوحية']++;
        else deviceData['أخرى']++;
      });

      const deviceCtx = document.getElementById('deviceChart');
      if (deviceCtx) {
        new Chart(deviceCtx, {
          type: 'doughnut',
          data: {
            labels: ['الهواتف', 'الحواسيب', 'الأجهزة اللوحية', 'أخرى'],
            datasets: [{
              data: [deviceData['الهواتف'], deviceData['الحواسيب'], deviceData['الأجهزة اللوحية'], deviceData['أخرى']],
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

    } catch (error) {
      console.error('❌ خطأ في تحميل المخططات:', error);
    }
  }

  // ==========================================================
  // 5. تفعيل القائمة الجانبية (للجوال)
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
  // 6. قائمة المستخدم (تسجيل الخروج)
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

  // ==========================================================
  // 7. تحميل المخططات بعد أن يتم تحميل المستخدم
  // ==========================================================
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      setTimeout(function() {
        loadCharts(user.uid);
      }, 800);
    }
  });

  console.log('✅ لوحة التحكم جاهزة (بيانات حقيقية)');
});
