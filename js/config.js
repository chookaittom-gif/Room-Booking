// กำหนด URL ของ Google Apps Script Web App Backend
const isVercel = window.location.hostname.includes('vercel.app') || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
window.appConfig = {
  apiUrl: isVercel ? '/api/gas' : 'https://script.google.com/macros/s/AKfycby2Zk6Cl6vTr1YTf8zCRjAodngMz9SwlqzyHM4Ygt-cDtYF8nCQWiJlGshQVCkGX-pvAA/exec'
};

// จำลองการใช้ google.script.run ด้วย Proxy Pattern (สำหรับความเข้ากันได้ย้อนหลัง 100%)
(function() {
  function createRunner(successCallback, failureCallback) {
    return new Proxy({}, {
      get: function(target, prop) {
        if (prop === 'withSuccessHandler') {
          return function(callback) {
            return createRunner(callback, failureCallback);
          };
        }
        if (prop === 'withFailureHandler') {
          return function(callback) {
            return createRunner(successCallback, callback);
          };
        }
        // ตรวจจับชื่อฟังก์ชันเซิร์ฟเวอร์
        return function(payload) {
          window.apiCall(prop, payload)
            .then(res => {
              if (successCallback) successCallback(res);
            })
            .catch(err => {
              if (failureCallback) failureCallback(err);
              else console.error(`Error executing ${prop}:`, err);
            });
        };
      }
    });
  }

  window.google = {
    script: {
      run: createRunner()
    }
  };
})();

// ===== กลุ่มเรียน (สาขา×รหัสปี) — ใช้ทั้ง editor / หน้ารวม / Excel export =====
// รหัส = ปีเข้า (พ.ศ.); ปีที่ N คำนวณจากปีการศึกษาปัจจุบัน (69→ปีที่ 1 … 66→ปีที่ 4)
window.classGroupTools = (function() {
  const CURRENT_ACADEMIC_YEAR = 2569;

  // key → {short: ชื่อย่อ, label: ชื่อเต็มตามหัวไฟล์ต้นทาง, order: ลำดับเรียง}
  const MAJORS = {
    food:       { short: 'อาหาร',  label: 'เทคโนโลยีการประกอบอาหารและการบริการ', order: 0, color: 'cg-food' },
    aviation:   { short: 'การบิน', label: 'ธุรกิจการบิน',                        order: 1, color: 'cg-aviation' },
    prathom:    { short: 'ประถม',  label: 'การประถมศึกษา',                      order: 2, color: 'cg-prathom' },
    anuban:     { short: 'ปฐมวัย', label: 'การศึกษาปฐมวัย',                     order: 3, color: 'cg-anuban' },
    none:       { short: '',       label: '',                                   order: 9, color: 'cg-none' }
  };

  // รายการกลุ่มมาตรฐานจากไฟล์ต้นทาง 2-69 (ใช้ใน dropdown ของ editor)
  const CLASS_GROUPS = [
    'อาหาร66', 'อาหาร66 ตกค้าง', 'อาหาร67',
    'อาหาร68 แผน ก', 'อาหาร68 แผน ข', 'อาหาร69 แผน ก', 'อาหาร69 แผน ข',
    'การบิน67', 'การบิน68', 'การบิน69',
    'ประถม66', 'ประถม67', 'ประถม68', 'ประถม69',
    'ปฐมวัย66', 'ปฐมวัย67', 'ปฐมวัย68', 'ปฐมวัย69'
  ];

  // แยก label เช่น "อาหาร69 แผน ก" / "อาหาร66 ตกค้าง" → โครงสร้างสำหรับเรียง/ระบายสี/แสดงผล
  function parseClassGroup(rawLabel) {
    const raw = String(rawLabel || '').trim();
    if (!raw) {
      return {
        raw: '', majorKey: 'none', majorShort: '', majorLabel: '',
        cohort: 0, yearNo: 0, yearLabel: '', plan: '', leftover: false,
        colorClass: 'cg-none', displayLabel: 'ไม่ระบุกลุ่ม',
        sortKey: '9:9:9:~'
      };
    }

    let namePart = raw;
    let plan = '';
    let leftover = false;

    const planM = namePart.match(/แผน\s*([ก-ฮ])/);
    if (planM) {
      plan = 'แผน ' + planM[1];
      namePart = namePart.replace(/[(\[]?แผน\s*[ก-ฮ][)\]]?/g, ' ');
    }
    if (/ตกค้าง/.test(namePart)) {
      leftover = true;
      namePart = namePart.replace(/[(\[]?ตกค้าง[)\]]?/g, ' ');
    }
    namePart = namePart.replace(/\s+/g, ' ').trim();

    // ชื่อสาขา (ตัดเลขรหัสท้ายชื่อออก) + รหัสปี
    let cohort = 0;
    let shortName = namePart;
    const cohortM = namePart.match(/(\d{2})\s*$/);
    if (cohortM) {
      cohort = Number(cohortM[1]);
      shortName = namePart.slice(0, cohortM.index).trim();
    }

    // หา majorKey จากชื่อย่อ (ยอมรับชื่อไม่ตรงเป๊ะ เช่น "เทคโนโลยีการประกอบอาหาร...")
    let majorKey = 'none';
    for (const [key, m] of Object.entries(MAJORS)) {
      if (key === 'none') continue;
      if (shortName.includes(m.short) || m.short.includes(shortName)) { majorKey = key; break; }
    }

    const major = MAJORS[majorKey];
    // รหัส = เลข 2 หลังของปีเข้า พ.ศ. (69 = 2569) → ปีที่ N = ปีการศึกษาปัจจุบัน - ปีเข้า + 1
    const yearNo = cohort ? (CURRENT_ACADEMIC_YEAR - (2500 + cohort) + 1) : 0;

    // แถวหัวข้อ: สาขาวิชา<เต็ม> (รหัส 6X) · ปีที่ N · แผน ก · ตกค้าง
    const parts = [];
    if (major.label) parts.push('สาขาวิชา' + major.label);
    else if (shortName) parts.push(shortName);
    if (cohort) parts.push('(รหัส ' + cohort + ')');
    if (yearNo) parts.push('ปีที่ ' + yearNo);
    if (plan) parts.push(plan);
    if (leftover) parts.push('ตกค้าง');

    return {
      raw,
      majorKey,
      majorShort: major.short || shortName,
      majorLabel: major.label,
      cohort,
      yearNo,
      yearLabel: yearNo ? ('ปีที่ ' + yearNo) : '',
      plan,
      leftover,
      colorClass: major.color,
      displayLabel: parts.join(' ') || raw,
      // เรียง: ลำดับสาขา → ปีที่ (1 ก่อน 4) → แผน (ก ก่อน ข) → ตกค้างท้าย — ทำเป็น ASCII ทั้งหมดเพื่อเทียบแบบ byte-order เสถียร
      sortKey: [
        String(major.order),
        yearNo ? String(yearNo) : '9',
        plan ? String.fromCharCode(97 + (plan.charCodeAt(4) - 3585)) : 'z',
        leftover ? '1' : '0',
        raw
      ].join(':')
    };
  }

  return { CURRENT_ACADEMIC_YEAR, MAJORS, CLASS_GROUPS, parseClassGroup };
})();
