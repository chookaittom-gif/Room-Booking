const SHEET_ID = '1iNoHn414loFcT8Yvx6iBJRnv2jsi9PyuX9lEn69V-Tw';
const SHEET_NAMES = {
  USERS: 'Users',
  ROOMS: 'Rooms',
  BOOKINGS: 'Bookings',
  CLASS_SCHEDULE: 'ClassSchedule',
  CONFIG: 'Config',
  STATISTICS: 'Statistics',
  UPLOADS: 'Uploads'
};

// ANCHOR:SERVER.doGet:REPLACE
function doGet(e) {
  // 1. ตรวจสอบว่าเป็นคำเรียกจาก API ภายนอกหรือไม่
  if (e && e.parameter && e.parameter.action) {
    try {
      const action = e.parameter.action;
      const payload = e.parameter.payload ? JSON.parse(e.parameter.payload) : {};
      return handleApiRequest(action, payload);
    } catch(err) {
      return corsResponse(fail_(err.message));
    }
  }

  // 2. เปิด frontend production เมื่อเปิด GAS URL โดยตรง
  const frontendUrl = 'https://room-booking-omega-three.vercel.app/';
  return HtmlService.createHtmlOutput(
    '<!doctype html><html><head><meta charset="UTF-8">' +
    '<meta http-equiv="refresh" content="0;url=' + frontendUrl + '">' +
    '</head><body><p>กำลังเปิดระบบจองห้องเรียน...</p>' +
    '<p><a href="' + frontendUrl + '" target="_top" rel="noopener">เปิดระบบจองห้องเรียน</a></p>' +
    '</body></html>'
  );
}

// อัปโหลดและรับ JSON API ทาง POST
function doPost(e) {
  try {
    let action = '';
    let payload = {};
    
    if (e && e.postData && e.postData.contents) {
      const data = JSON.parse(e.postData.contents);
      action = data.action;
      payload = data.payload || {};
    } else if (e && e.parameter && e.parameter.action) {
      action = e.parameter.action;
      payload = e.parameter.payload ? JSON.parse(e.parameter.payload) : {};
    }
    
    if (!action) {
      return corsResponse(fail_('Missing action parameter'));
    }
    
    return handleApiRequest(action, payload);
  } catch (err) {
    return corsResponse(fail_('POST Error: ' + err.message));
  }
}

function corsResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleApiRequest(action, payload) {
  try {
    const allowedActions = [
      'getRooms',
      'getInitialData',
      'getBookings',
      'getRoomSchedule',
      'getRoomScheduleRange',
      'getRoomWeekSchedule',
      'getCombinedSchedule',
      'getCombinedScheduleWeek',
      'getStatistics',
      'getRecentBookingsByPhone',
      'getBookingById',
      'getById',
      'createBooking',
      'cancelBookingUnified',
      'saveUploads',
      'login',
      'loginUser',
      'logout',
      'getSession',
      'processBookingAction',
      'listCancelableBookingsByPhone',
      'approveBooking',
      'rejectBooking',
      'testRoomsData',
      'MANUAL_CLEAR_ROOMS_CACHE',
      'generatePdfReport',
      'selfTest'
    ];
    
    if (allowedActions.indexOf(action) === -1) {
      return corsResponse(fail_(`Action "${action}" is not allowed`));
    }
    
    if (typeof globalThis[action] !== 'function') {
      return corsResponse(fail_(`Function "${action}" not found on server`));
    }
    
    const result = globalThis[action](payload);
    return corsResponse(result);
  } catch (err) {
    return corsResponse(fail_(`Execution error for "${action}": ${err.message}`));
  }
}
// ANCHOR:SERVER.doGet:END

// ====== Result helpers ======
function ok_(data)  { return { ok: true,  data }; }
function fail_(err) { return { ok: false, error: String(err || 'unknown') }; }

// ====== FIXED DATE HELPER FUNCTIONS ======
function formatThaiDateFullHelper(dateObj) {
  if (!dateObj) return '-';
  const thaiMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  // แปลง String เป็น Date ถ้าจำเป็น
  const d = (dateObj instanceof Date) ? dateObj : new Date(dateObj);
  
  if (isNaN(d.getTime())) return '-';

  const day = d.getDate();
  const month = thaiMonths[d.getMonth()];
  const year = d.getFullYear() + 543;
  return `${day} ${month} ${year}`;
}


// สร้าง Map ของ RoomID -> RoomName เพื่อให้ค้นหาเร็วๆ
function getRoomMapHelper() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Rooms'); // แก้ชื่อชีตตามจริง
  if (!sheet) return {};
  
  const data = sheet.getDataRange().getValues();
  const map = {};
  // Header: RoomID(0) | RoomName(1)
  for (let i = 1; i < data.length; i++) {
    const rid = String(data[i][0]);
    const rname = data[i][1];
    map[rid] = rname;
  }
  return map;
}

function cancelBookingUnified(payload) {
  try {
    const data = payload || {};
    const bookingId = String(data.bookingId || '').trim();
    const phoneNumber = String(data.phoneNumber || '').trim();
    const reason = String(data.reason || '').trim();
    const role = String(data.role || '').toLowerCase();
    const actor = String(data.actor || '').trim() || 'system';

    if (!bookingId) return fail_('ไม่พบ BookingID');
    if (!reason) return fail_('กรุณาระบุเหตุผลการยกเลิก');

    const isAdmin = (role === 'admin' || role === 'superadmin' || role === 'super_admin');

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sh = ss.getSheetByName(SHEET_NAMES.BOOKINGS || 'Bookings');
    if (!sh) return fail_('ไม่พบชีต Bookings');

    const values = sh.getDataRange().getValues();
    if (!values || values.length < 2) return fail_('ไม่มีข้อมูลการจอง');

    const headers = values[0].map(h => String(h || '').trim());
    const col = (name) => headers.indexOf(name);

    const idCol = col('BookingID');
    const phoneCol = col('PhoneNumber');
    const statusCol = col('Status');
    const remarkCol = col('Remark');
    const cancelByCol = col('CancelledBy');
    const cancelAtCol = col('CancelAt');

    if (idCol < 0 || statusCol < 0 || remarkCol < 0) {
      return fail_('โครงสร้างชีต Bookings ไม่ถูกต้อง');
    }

    let foundRows = [];
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][idCol] || '').trim() === bookingId) {
        let rowData = {};
        headers.forEach((h, j) => rowData[h] = values[i][j]);
        foundRows.push({ rowIndex: i + 1, rowData: rowData });
      }
    }

    if (foundRows.length === 0) return fail_('ไม่พบการจองที่ระบุ');

    const firstRowData = foundRows[0].rowData;

    if (!isAdmin) {
      const sheetPhone = String(firstRowData.PhoneNumber || '').replace(/\D/g, '');
      const inputPhone = String(phoneNumber || '').replace(/\D/g, '');
      if (!inputPhone) return fail_('กรุณาระบุเบอร์โทรศัพท์');
      if (sheetPhone !== inputPhone) return fail_('เบอร์โทรศัพท์ไม่ตรงกับที่ใช้จอง');
    }

    // Update Sheet for all rows
    foundRows.forEach(item => {
      sh.getRange(item.rowIndex, statusCol + 1).setValue('ยกเลิก');
      sh.getRange(item.rowIndex, remarkCol + 1).setValue(reason);
      if (cancelByCol >= 0) sh.getRange(item.rowIndex, cancelByCol + 1).setValue(isAdmin ? actor : '');
      if (cancelAtCol >= 0) sh.getRange(item.rowIndex, cancelAtCol + 1).setValue(new Date());
    });

    SpreadsheetApp.flush();

    // Telegram (ส่งเพียงข้อความเดียวรวม)
    const rowObj = { ...firstRowData };
    rowObj.Status = 'ยกเลิก';
    rowObj.Remark = reason;
    rowObj.CancelledBy = isAdmin ? actor : '';
    sendTelegramNotification(rowObj, isAdmin ? 'cancelAdmin' : 'cancelBooker', false);

    // Update statistics
    foundRows.forEach(item => {
      try {
        if (typeof updateStatistics === 'function') {
          const roomId = String(item.rowData.RoomID || '').trim();
          const bDate = item.rowData.BookingDate;
          updateStatistics(roomId, bDate, 'cancel');
        }
      } catch (e) {
        Logger.log('updateStatistics(cancel) error: ' + (e && e.message ? e.message : e));
      }
    });

    return ok_({ message: 'ยกเลิกการจองเรียบร้อยแล้ว' });

  } catch (e) {
    Logger.log('cancelBookingUnified error: ' + e);
    return fail_('ยกเลิกการจองไม่สำเร็จ');
  }
}

function sendTelegramMsgHelper(message, isDryRun = false) {
  if (message == null) message = '';
  message = String(message);

  if (message.includes('Robot Test') || message.includes('Auto Test')) {
    Logger.log('🛡️ Safety Lock Active: ระงับการส่ง Telegram จริง -> เปลี่ยนเป็น Log');
    isDryRun = true;
  }

  if (isDryRun) {
    Logger.log('--------------------------------------------------');
    Logger.log('🧪 [DRY RUN MODE] ข้อความที่จะส่งเข้า Telegram:');
    Logger.log(message);
    Logger.log('--------------------------------------------------');
    // ✅ BERRY FIX: เพิ่ม property 'message' ส่งกลับไปด้วย เพื่อให้ Test มองเห็น
    return { ok: true, dryRun: true, message: message }; 
  }

  const config = getConfigMap();
  const token = (config['TelegramBotToken'] || config['TELEGRAM_BOT_TOKEN'] || '').trim();
  const chatId = (config['TelegramChatID'] || config['TELEGRAM_CHAT_ID'] || '').trim();

  if (!token || !chatId) {
    Logger.log('❌ Telegram Config Missing: ไม่พบ TelegramBotToken/TelegramChatID ในชีต Config');
    return { ok: false, error: 'Missing token/chatId' };
  }

  const url = 'https://api.telegram.org/bot' + token + '/sendMessage';
  const payload = {
    chat_id: chatId,
    text: message,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  };

  try {
    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      payload: payload,
      muteHttpExceptions: true
    });

    const code = res.getResponseCode();
    const body = res.getContentText() || '';

    if (code >= 200 && code < 300) {
      Logger.log('✅ Telegram sent successfully');
      return { ok: true, code: code };
    }

    Logger.log('❌ Telegram API failed: ' + code + ' ' + body);
    return { ok: false, code: code, response: body };

  } catch (e) {
    Logger.log('❌ Telegram fetch exception: ' + (e && e.message ? e.message : e));
    return { ok: false, error: String(e) };
  }
}



function parseFlexibleDate(dateValue) {
  if (!dateValue) return null;
  let dateObj = null;
  
  try {
    if (dateValue instanceof Date) {
      dateObj = dateValue;
    } else if (typeof dateValue === 'string') {
      const dateStr = dateValue.trim().split(/\s+/)[0];
      
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        // ISO format: YYYY-MM-DD
        const [year, month, day] = dateStr.split('-').map(Number);
        dateObj = new Date(year, month - 1, day);
      } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
        // Handle DD/MM/YYYY format
        const parts = dateStr.split('/');
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        let year = parseInt(parts[2], 10);
        
        // [FIX] ป้องกันปัญหาปี พ.ศ. ซ้ำซ้อน
        // ถ้าปีที่อ่านได้ > 2400 ให้ถือว่าเป็น พ.ศ. และแปลงเป็น ค.ศ. ก่อน
        if (year > 2400) {
            year -= 543;
        }
        
        dateObj = new Date(year, month - 1, day);
        
        if (dateObj.getDate() !== day || dateObj.getMonth() !== month - 1 || dateObj.getFullYear() !== year) {
          dateObj = null;
        }
      } else {
        dateObj = new Date(dateStr);
        if (isNaN(dateObj.getTime())) dateObj = null;
      }
    } else if (typeof dateValue === 'number') {
      dateObj = new Date(dateValue);
    }
    
    // Final check for double-BE logic in parsed objects
    if (dateObj && !isNaN(dateObj.getTime())) {
        const y = dateObj.getFullYear();
        if (y > 2400) {
            dateObj.setFullYear(y - 543);
        }
    }
    
  } catch (error) {
    Logger.log(`parseFlexibleDate error: ${error.message} for input: ${dateValue}`);
    dateObj = null;
  }
  
  return dateObj;
}

function formatDateISO(dateObj) {
  if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return '';
  }
  
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// ANCHOR:SERVER.getInitialData:REPLACE
function getInitialData(sessionToken) {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  const roomData = getAllRooms(ss);
  const scheduleData = getClassSchedule(ss);
  const configData = getConfig(ss);

  const sessionRes = getSession(sessionToken);
  const sessionData = sessionRes && sessionRes.ok ? sessionRes.data : null;

  // ✅ FIX: ใช้ ok_() เพื่อห่อข้อมูลใน 'data' ให้ตรงมาตรฐาน API และ Diagnostic
  return ok_({
    rooms: roomData,
    classSchedule: scheduleData,
    config: configData,
    session: sessionData,
    currentDate: new Date().toISOString().slice(0, 10)
  });
}
// ANCHOR:SERVER.getInitialData:END


function getAllRooms(ss) {
  const sheet = ss ? ss.getSheetByName(SHEET_NAMES.ROOMS) : SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAMES.ROOMS);
  if (!sheet) return [];

  const rows = sheetToObjects(sheet);
  return rows.map(r => {
    const roomId = String(r.RoomID || '').trim();
    const roomName = String(r.RoomName || '').trim();
    const icon = String(r.IconName || '').trim();
    const img = String(r.ImageURL || r.RoomImage || r.PhotoURL || r.PictureURL || '').trim();
    return {
      id: roomId,
      RoomID: roomId,
      name: roomName,
      RoomName: roomName,
      capacity: r.Capacity,
      Capacity: r.Capacity,
      icon: icon,
      IconName: icon,
      location: String(r.Location || '').trim(),
      Location: String(r.Location || '').trim(),
      ImageURL: img
    };
  }).filter(r => r.RoomID && r.RoomName);
}

function getClassSchedule(ss) {
  const target = ss ? ss : SpreadsheetApp.openById(SHEET_ID);
  const sheet = target.getSheetByName(SHEET_NAMES.CLASS_SCHEDULE);
  if (!sheet) return [];

  const data = sheet.getDataRange().getDisplayValues();
  data.shift();

  return data
    .filter(row => row && row.length >= 1)
    .map(row => ({
      roomId: String(row[0] || '').trim(),
      day: String(row[1] || '').trim(),
      startTime: String(row[2] || '').trim(),
      endTime: String(row[3] || '').trim(),
      subject: String(row[4] || '').trim(),
      instructor: String(row[5] || '').trim(),
      validFrom: String(row[6] || '').trim(),
      validTo: String(row[7] || '').trim()
    }))
    .filter(r => r.roomId);
}



// ====== AUTH ======
function login(payload) {
  try {
    const obj = (payload && typeof payload === 'object')
      ? payload
      : { username: arguments[0], password: arguments[1] };

    const username = String(obj.username || '').trim();
    const password = String(obj.password || '').trim();

    if (!username || !password) return fail_('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sh = ss.getSheetByName(SHEET_NAMES.USERS || 'Users');
    if (!sh) return fail_('ไม่พบชีต Users');

    const rows = sheetToObjects(sh);
    
    // ค้นหา User (Case-insensitive สำหรับ Username)
    const u = rows.find(r =>
      String(r.Username || '').trim().toLowerCase() === username.toLowerCase() &&
      String(r.Password || '').trim() === password
    );
    
    if (!u) return fail_('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');

    // จัดการ Role และ DisplayName
    const role = String(u.Role || 'user').trim().toLowerCase();
    const disp = String(u.DisplayName || u.Username || username).trim();
    const phone = String(u.PhoneNumber || '').trim();

    return ok_({ 
      username: u.Username, 
      role: role, 
      displayName: disp,
      phone: phone 
    });

  } catch (e) {
    Logger.log('login error: ' + e);
    return fail_('เข้าสู่ระบบไม่สำเร็จ: ' + (e.message || e));
  }
}


function loginUser(payload) {
  try {
    const res = login(payload);

    if (!res || res.ok !== true) {
      const msg = (res && res.error) ? String(res.error) : 'เข้าสู่ระบบไม่สำเร็จ';
      return { status: false, message: msg };
    }

    const user = res.data || null;
    if (!user || !user.username || !user.role) {
      return { status: false, message: 'ข้อมูลผู้ใช้ไม่ครบถ้วน' };
    }

    const token = Utilities.getUuid();
    const now = Date.now();

    const sp = PropertiesService.getScriptProperties();
    sp.setProperty(
      'SESSION_' + token,
      JSON.stringify({
        username: String(user.username),
        role: String(user.role),
        displayName: String(user.displayName || ''),
        createdAt: now
      })
    );

    return {
      status: true,
      sessionToken: token,
      user: {
        username: user.username,
        role: user.role,
        displayName: user.displayName || ''
      }
    };

  } catch (e) {
    Logger.log('loginUser error: ' + e);
    return { status: false, message: 'เข้าสู่ระบบไม่สำเร็จ' };
  }
}

function logout(sessionToken) {
  try {
    if (sessionToken) {
      PropertiesService.getScriptProperties().deleteProperty('SESSION_' + sessionToken);
    }
    return ok_({ message: 'ออกจากระบบเรียบร้อย' });
  } catch (e) {
    Logger.log('logout error: ' + e);
    return fail_('เกิดข้อผิดพลาดในการออกจากระบบ');
  }
}



function getSession(sessionToken) {
  try {
    if (!sessionToken) return ok_(null);

    const sp = PropertiesService.getScriptProperties();
    const raw = sp.getProperty('SESSION_' + sessionToken);
    if (!raw) return ok_(null);

    const data = JSON.parse(raw);
    if (!data || !data.username || !data.role) return ok_(null);

    return ok_({
      username: data.username,
      role: data.role,
      displayName: data.displayName
    });
  } catch (e) {
    Logger.log('getSession error: ' + e);
    return ok_(null);
  }
}



// ====== DATA HELPERS ======
function sheetToObjects(sheet) {
  if (!sheet) return [];
  const data = sheet.getDataRange().getDisplayValues(); // ใช้ getDisplayValues() เพื่อรักษา format
  if (data.length <= 1) return [];
  const headers = data[0].map(h => String(h).trim());
  return data.slice(1).filter(r => r.some(c => c !== "")).map(row => {
    const o = {}; 
    headers.forEach((h, i) => {
      let value = row[i];
      o[h] = (typeof value === 'string') ? value.trim() : value;
    }); 
    return o;
  });
}

function getUsers() { 
    return sheetToObjects(SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAMES.USERS)); 
}

// ANCHOR:SERVER.util.normalizePhone:START
function normalizePhone(v) {
  // Step 1: Remove all non-digit characters
  let s = String(v ?? '').replace(/\D/g, '');
  if (!s) return '';

  // Step 2: Handle international format (e.g., 66812345678 -> 0812345678)
  if (s.length === 11 && s.startsWith('66')) {
    return '0' + s.substring(2);
  }

  // Step 3: Handle 9-digit numbers (e.g., 812345678 -> 0812345678)
  if (s.length === 9 && !s.startsWith('0')) {
    return '0' + s;
  }

  // Step 4: If it's already a valid 10-digit number or other format, return as is.
  return s;
}
// ANCHOR:SERVER.util.normalizePhone:END

// ====== Cache helpers ======
const CACHE_TTL_SEC = 21600;
function cacheGet_(k) { try { return CacheService.getScriptCache().get(k); } catch (e) { return null; } }
function cachePut_(k, v, ttl = CACHE_TTL_SEC) { try { CacheService.getScriptCache().put(k, v, ttl); } catch (e) { /* Ignore cache put errors */ } }

// ====== DATA GETTERS ======
// ✅ BERRY FIX: สร้าง Helper ส่วนตัวสำหรับ Server เรียกใช้กันเอง (คืนค่า Array เสมอ)
function getRoomsInternal_() {
  try {
    const key = 'rooms_json_v2';
    // 1. ลองอ่านจาก Cache
    const c = cacheGet_(key);
    if (c) {
      const cached = JSON.parse(c);
      if (Array.isArray(cached)) return cached;
    }
    
    // 2. ถ้าไม่มี อ่านจาก Sheet
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const roomSheet = ss.getSheetByName(SHEET_NAMES.ROOMS || 'Rooms');
    if (!roomSheet) return [];
    
    const rooms = sheetToObjects(roomSheet);
    
    // 3. บันทึก Cache (เก็บเฉพาะข้อมูลที่จำเป็นเพื่อประหยัดที่)
    if (rooms && rooms.length > 0) {
        const leanRooms = rooms.map(r => ({
           RoomID: String(r.RoomID),
           RoomName: String(r.RoomName),
           Capacity: r.Capacity,
           IconName: r.IconName,
           Location: r.Location,
           ImageURL: String(r.ImageURL || r.RoomImage || r.PhotoURL || r.PictureURL || '').trim()
        }));
        cachePut_(key, JSON.stringify(leanRooms), 21600); // 6 Hours
        return leanRooms;
    }
    return [];
  } catch (e) {
    Logger.log('getRoomsInternal_ error: ' + e);
    return [];
  }
}

// ANCHOR:SERVER.getRooms:REPLACE
// ฟังก์ชัน API สำหรับ Client (คืนค่าเป็น Object มาตรฐาน)
function getRooms() {
  try {
    const rooms = getRoomsInternal_();
    return ok_(rooms);
  } catch (err) { 
    return fail_(err.toString());
  }
}

function getRoomSchedule(payload) {
  try {
    const dataIn = (payload && typeof payload === 'object') ? payload : { roomId: arguments[0], dateISO: arguments[1] };
    const roomId = String(dataIn.roomId || '').trim().toLowerCase();
    const dateISO = String(dataIn.dateISO || '').trim();

    if (!roomId || !dateISO) {
      return ok_({ room: {}, date: dateISO || '', slots: [], summary: { total: 0 } });
    }

    // 1. แปลงวันที่เป้าหมายเป็น String (YYYY-MM-DD) เพื่อเทียบแบบ String
    const targetDate = parseFlexibleDate(dateISO);
    if (!targetDate) return fail_('รูปแบบวันที่ไม่ถูกต้อง');
    const targetISO = formatDateISO(targetDate);

    const ss = SpreadsheetApp.openById(SHEET_ID);
    
    // ดึง Metadata ห้อง
    const rooms = getRoomsInternal_();
    const roomMeta = rooms.find(r => String(r.RoomID).trim().toLowerCase() === roomId) || { RoomID: roomId, RoomName: 'ห้อง ' + roomId };

    // ==========================================
    // 2. ดึงการจอง (Booking)
    // ==========================================
    const shBook = ss.getSheetByName(SHEET_NAMES.BOOKINGS || 'Bookings');
    const bookings = [];
    if (shBook) {
        const rows = sheetToObjects(shBook);
        const allowedStatus = ['รออนุมัติ', 'อนุมัติ', 'pending', 'approved', 'approve'];

        rows.forEach(b => {
            if (String(b.RoomID).trim().toLowerCase() !== roomId) return;
            
            const bDate = parseFlexibleDate(b.BookingDate);
            if (!bDate) return;
            
            // Compare by String (Safe)
            if (formatDateISO(bDate) === targetISO) {
                const status = String(b.Status || '').trim().toLowerCase();
                if (allowedStatus.includes(status)) {
                    bookings.push({
                        type: 'booking',
                        bookingId: String(b.BookingID),
                        title: String(b.Purpose),
                        subject: String(b.Purpose),
                        instructor: String(b.BookerName),
                        booker: String(b.BookerName),
                        teacherName: b.teacherName || b.TeacherName || b.teacher || b.instructor || b.instructorName || b.lecturer || b.lecturerName || b['อาจารย์ผู้สอน'] || b['ผู้สอน'] || '',
                        start: formatTimeFromSheet(b.StartTime),
                        end: formatTimeFromSheet(b.EndTime),
                        date: targetISO,
                        status: (status === 'อนุมัติ' || status === 'approved' || status === 'approve') ? 'approved' : 'pending'
                    });
                }
            }
        });
    }

    // ==========================================
    // 3. ดึงตารางสอน (Class)
    // ==========================================
    const shClass = ss.getSheetByName(SHEET_NAMES.CLASS_SCHEDULE || 'ClassSchedule');
    const classes = [];
    if (shClass) {
        const rows = shClass.getDataRange().getDisplayValues().slice(1);
        const dayIdx = targetDate.getDay(); 
        
        // ข้ามเสาร์-อาทิตย์ สำหรับตารางสอน
        if (dayIdx !== 0 && dayIdx !== 6) {
            rows.forEach(r => {
                if (String(r[0] || '').trim().toLowerCase() !== roomId) return;
                
                const dayNameInSheet = String(r[1]).toLowerCase();
                if (isDayMatch_(targetDate, dayNameInSheet)) {
                    // Check Valid Period
                    const validFrom = parseFlexibleDate(r[6]);
                    const validTo = parseFlexibleDate(r[7]);
                    const currTime = targetDate.getTime();
                    
                    // ตั้งเวลาเที่ยงวันเพื่อเลี่ยง Timezone Issue
                    if(validFrom) validFrom.setHours(12,0,0,0);
                    if(validTo) validTo.setHours(12,0,0,0);
                    const checkTime = new Date(targetDate);
                    checkTime.setHours(12,0,0,0);

                    let isValid = true;
                    if (validFrom && checkTime < validFrom) isValid = false;
                    if (validTo && checkTime > validTo) isValid = false;

                    if (isValid) {
                        classes.push({
                            type: 'class',
                            title: String(r[4] || 'วิชาเรียน'),
                            subject: String(r[4] || 'วิชาเรียน'),
                            instructor: String(r[5] || ''),
                            teacherName: String(r[5] || ''),
                            start: formatTimeFromSheet(r[2]),
                            end: formatTimeFromSheet(r[3]),
                            date: targetISO,
                            status: 'class'
                        });
                    }
                }
            });
        }
    }

    const allSlots = [...classes, ...bookings].sort((a, b) => String(a.start).localeCompare(String(b.start)));

    return ok_({
      room: { name: roomMeta.RoomName, RoomID: roomMeta.RoomID, capacity: roomMeta.Capacity },
      date: targetISO,
      slots: allSlots,
      summary: { total: allSlots.length }
    });

  } catch (e) {
    Logger.log('getRoomSchedule error: ' + e);
    return fail_('ไม่สามารถดึงตารางห้องได้: ' + e.message);
  }
}

// ANCHOR:SERVER.getBookingDetail:REPLACE
function getBookingDetail(bookingId) {
  try {
    if (!bookingId) return fail_('ไม่ได้ระบุรหัสการจอง');
    
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const bookings = sheetToObjects(ss.getSheetByName(SHEET_NAMES.BOOKINGS));
    const booking = bookings.find(x => String(x.BookingID) === String(bookingId));
    
    if (!booking) return fail_('ไม่พบการจองที่ระบุ');
    
    // 🔥 Fix: เรียกใช้ Internal Helper ที่นี่ด้วย
    const rooms = getRoomsInternal_();
    const room = rooms.find(r => String(r.RoomID).trim().toLowerCase() === String(booking.RoomID).trim().toLowerCase());
    
    const formattedDate = booking.BookingDate ? formatThaiDateFullHelper(booking.BookingDate) : '-';
    
    const result = {
      ...booking,
      teacherName: booking.teacherName || booking.TeacherName || booking.teacher || booking.instructor || booking.instructorName || booking.lecturer || booking.lecturerName || booking['อาจารย์ผู้สอน'] || booking['ผู้สอน'] || '',
      formattedDate,
      StartTime: formatTimeFromSheet(booking.StartTime),
      EndTime: formatTimeFromSheet(booking.EndTime),
      roomDetails: room ? { name: room.RoomName, location: room.Location } : null
    };
    
    return ok_({ booking: result });
  } catch (e) {
    return fail_('เกิดข้อผิดพลาด: ' + e.message);
  }
}

// --- Helper ย่อยสำหรับ getRoomSchedule (เพิ่มไว้ท้ายไฟล์เผื่อยังไม่มี) ---

function getActiveBookingsForDay_(ss, roomId, dayISO) {
    const sh = ss.getSheetByName(SHEET_NAMES.BOOKINGS);
    if(!sh) return [];
    const rows = sheetToObjects(sh);
    return rows.filter(b => {
        const d = parseFlexibleDate(b.BookingDate);
        return d && formatDateISO(d) === dayISO && 
               String(b.RoomID).trim().toLowerCase() === String(roomId).trim().toLowerCase() && 
               ['รออนุมัติ', 'อนุมัติ'].includes(b.Status);
    }).map(b => ({
        type: 'booking',
        bookingId: b.BookingID,
        title: b.Purpose,
        start: formatTimeFromSheet(b.StartTime),
        end: formatTimeFromSheet(b.EndTime),
        status: b.Status === 'อนุมัติ' ? 'approved' : 'pending',
           booker: b.BookerName
    }));
}

// [ANCHOR:SERVER.getClassesForDay_:REPLACE]
function getClassesForDay_(ss, roomId, targetDate, existingBookings) {
    try {
        const sh = ss.getSheetByName('ClassSchedule');
        if (!sh) return [];

        const getDayKw = (d) => {
            const idx = d.getDay();
            const map = [
                ['อาทิตย์', 'sun', 'sunday', 'อา.', 'อา'],
                ['จันทร์', 'mon', 'monday', 'จ.', 'จ'],
                ['อังคาร', 'tue', 'tuesday', 'อ.', 'อ'],
                ['พุธ', 'wed', 'wednesday', 'พ.', 'พ'],
                ['พฤหัสบดี', 'thu', 'thursday', 'พฤ.', 'พฤ', 'phu'],
                ['ศุกร์', 'fri', 'friday', 'ศ.', 'ศ'],
                ['เสาร์', 'sat', 'saturday', 'ส.', 'ส']
            ];
            return map[idx] || [];
        };

        const targetKeywords = getDayKw(targetDate);
        const checkDate = new Date(targetDate);
        checkDate.setHours(0, 0, 0, 0);

        const approvedBookings = (existingBookings || []).filter(b => b.status === 'approved');
        const toMinutes = (t) => {
            const s = String(t || '').trim();
            const m = s.match(/^(\d{1,2})[:.](\d{2})/);
            return m ? Number(m[1]) * 60 + Number(m[2]) : null;
        };

        const data = sh.getDataRange().getDisplayValues();
        const rows = data.slice(1);
        const slots = [];

        rows.forEach(row => {
            const rRoomId = String(row[0] || '').trim();
            const rDay = String(row[1] || '').toLowerCase().trim();

            if (rRoomId.toLowerCase() !== String(roomId).trim().toLowerCase()) return;

            const isDayMatch = targetKeywords.some(kw => rDay.includes(kw));
            if (!isDayMatch) return;

            const validFrom = parseFlexibleDate(row[6]);
            const validTo = parseFlexibleDate(row[7]);

            if (validFrom) {
                validFrom.setHours(0, 0, 0, 0);
                if (checkDate.getTime() < validFrom.getTime()) return;
            }
            if (validTo) {
                validTo.setHours(0, 0, 0, 0);
                if (checkDate.getTime() > validTo.getTime()) return;
            }

            const startStr = formatTimeFromSheet(row[2]);
            const endStr = formatTimeFromSheet(row[3]);

            const startMin = toMinutes(startStr);
            const endMin = toMinutes(endStr);

            const isOverridden = approvedBookings.some(b => {
                const bStart = toMinutes(b.start);
                const bEnd = toMinutes(b.end);
                if (startMin === null || endMin === null || bStart === null || bEnd === null) return false;
                return Math.max(startMin, bStart) < Math.min(endMin, bEnd);
            });

            if (!isOverridden) {
                slots.push({
                    type: 'class',
                    title: String(row[4] || 'วิชาเรียน'),
                    subject: String(row[4] || 'วิชาเรียน'),
                    instructor: String(row[5] || '-'),
                    start: startStr,
                    end: endStr,
                    status: 'class',
                    roomId: rRoomId,
                    date: formatDateISO(checkDate)
                });
            }
        });

        return slots;
    } catch (e) {
        Logger.log('getClassesForDay_ Error: ' + e);
        return [];
    }
}

function getConfig() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName(SHEET_NAMES.CONFIG || 'Config');
  if (!sh) return {};

  const values = sh.getDataRange().getDisplayValues();
  if (!values || values.length < 2) return {};

  const header = values[0].map(v => String(v || '').trim().toLowerCase());
  const keyCol = header.indexOf('key') !== -1 ? header.indexOf('key') : 0;
  const valCol = header.indexOf('value') !== -1 ? header.indexOf('value') : 1;

  const out = {};
  for (let i = 1; i < values.length; i++) {
    const k = String(values[i][keyCol] || '').trim();
    const v = String(values[i][valCol] || '').trim();
    if (k) out[k] = v;
  }
  return out;
}

function getConfigMap() {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sh = ss.getSheetByName(SHEET_NAMES.CONFIG || 'Config');
    if (!sh) return {};

    const values = sh.getDataRange().getDisplayValues();
    const out = {};
    for (let i = 1; i < values.length; i++) {
      const k = String(values[i][0] || '').trim();
      const v = String(values[i][1] || '').trim();
      if (k) out[k] = v;
    }
    return out;
  } catch (err) {
    Logger.log('getConfigMap error: ' + err);
    return {};
  }
}

function saveUploads(payload) {
  try {
    const MAX_FILES = 5;
    const MAX_SIZE = 5 * 1024 * 1024;
    const ALLOW = new Set([
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png'
    ]);

    if (!payload || !payload.bookingId) return fail_('missing bookingId');

    const bookingId = String(payload.bookingId).trim();
    const files = Array.isArray(payload.files) ? payload.files : [];
    if (!files.length) return ok_([]);

    if (files.length > MAX_FILES) {
      return fail_('อัปโหลดได้ไม่เกิน ' + MAX_FILES + ' ไฟล์ต่อครั้ง');
    }

    const cfg = getConfigMap();
    const parentId = String(cfg.UploadFolderID || cfg.UPLOAD_FOLDER_ID || '').trim();
    if (!parentId) return fail_('ไม่พบค่า UploadFolderID ในชีต Config');

    const parentFolder = DriveApp.getFolderById(parentId);
    if (!parentFolder) return fail_('ไม่พบโฟลเดอร์อัปโหลดหลัก');

    const targetFolder = getOrCreateFolder_(parentFolder, 'ClassroomBooking_Uploads');
    if (!targetFolder) return fail_('ไม่สามารถเข้าถึงหรือสร้างโฟลเดอร์สำหรับอัปโหลดได้');

    const out = [];
    files.forEach((f, idx) => {
      const name = String((f && f.name) ? f.name : ('upload_' + (idx + 1)));
      const mime = String((f && f.mimeType) ? f.mimeType : 'application/octet-stream');

      if (f && f.base64Data) {
        const approxBytes = Math.floor((String(f.base64Data).length * 3) / 4);
        if (approxBytes > MAX_SIZE) throw new Error('ไฟล์ ' + name + ' มีขนาดเกิน 5MB');
      }

      if (mime && !ALLOW.has(mime) && mime !== 'application/octet-stream') {
        throw new Error('ชนิดไฟล์ไม่รองรับ: ' + name);
      }

      const blob = toBlob_(f);
      if (!blob) throw new Error('payload ของไฟล์ไม่ถูกต้อง: ' + name);

      const safeBase = String(name || 'upload')
        .replace(/[\\/:*?"<>|]+/g, '_')
        .replace(/\s+/g, ' ')
        .trim() || 'upload';
      const uniqueName = (bookingId + '_' + Date.now() + '_' + idx + '_' + safeBase).substring(0, 200);
      try {
        blob.setName(uniqueName);
      } catch (eName) {}

      const file = targetFolder.createFile(blob);
      file.setDescription('Booking ID: ' + bookingId);

      try {
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (e) {}

      out.push({
        id: file.getId(),
        name: file.getName(),
        url: file.getUrl(),
        mime: file.getMimeType()
      });
    });

    const ss = SpreadsheetApp.openById(SHEET_ID);

    // --- Uploads sheet ---
    const uploadsSh = ss.getSheetByName(SHEET_NAMES.UPLOADS || 'Uploads') || ss.insertSheet('Uploads');
    if (uploadsSh.getLastRow() === 0) {
      uploadsSh.appendRow(['BookingID', 'FileID', 'FileName', 'FileURL', 'MimeType', 'UploadDate']);
    }

    const nowText = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss');
    const rows = out.map(f => [bookingId, f.id, f.name, f.url, f.mime, nowText]);
    uploadsSh.getRange(uploadsSh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);

    // --- Update Bookings.UploadedFiles (เก็บเป็น URL รวมไว้ เพื่อให้หน้าเว็บดึงได้ง่าย) ---
    const bookingsSh = ss.getSheetByName(SHEET_NAMES.BOOKINGS || 'Bookings');
    if (bookingsSh) {
      const data = bookingsSh.getDataRange().getValues();
      const header = data[0].map(x => String(x || '').trim());
      const idCol = header.indexOf('BookingID');
      const uploadedCol = header.indexOf('UploadedFiles');

      if (idCol >= 0 && uploadedCol >= 0) {
        for (let r = 1; r < data.length; r++) {
          if (String(data[r][idCol] || '').trim() === bookingId) {
            const currentLinks = String(data[r][uploadedCol] || '').trim();
            const newLinks = out.map(f => String(f.url || '').trim()).filter(Boolean).join(' | ');
            const allLinks = currentLinks ? (currentLinks + ' | ' + newLinks) : newLinks;
            bookingsSh.getRange(r + 1, uploadedCol + 1).setValue(allLinks);
          }
        }
      }
    }

    SpreadsheetApp.flush();

    // --- Telegram notify (หลังอัปโหลดเสร็จจริง) ---
    try {
      Logger.log('saveUploads:telegram:START bookingId=' + bookingId);
      const res = sendTelegramNotification({ BookingID: bookingId }, 'Upload', false);
      Logger.log('saveUploads:telegram:END ok=' + (res && res.ok));
      if (res && res.code != null) Logger.log('saveUploads:telegram:http=' + res.code);
      if (res && res.error) Logger.log('saveUploads:telegram:error=' + res.error);
      if (res && res.response) Logger.log('saveUploads:telegram:response=' + res.response);
    } catch (e) {
      Logger.log('saveUploads:telegram:error ' + (e && e.message ? e.message : e));
    }

    return ok_(out);

  } catch (err) {
    Logger.log('saveUploads error: ' + err);
    return fail_(err && err.message ? err.message : 'อัปโหลดไฟล์ไม่สำเร็จ');
  }
}

function notifyTelegramUploads(bookingId) {
  try {
    const bid = String(bookingId || '').trim();
    if (!bid) return { ok: false, error: 'missing bookingId' };

    const fileLinks = getTelegramFileLinks(bid);
    if (!fileLinks || !fileLinks.length) {
      Logger.log('notifyTelegramUploads: no files for bookingId=' + bid);
      return { ok: true, skipped: true };
    }

    const payload = { BookingID: bid };
    const res = sendTelegramNotification(payload, 'Upload', false);
    return res;
  } catch (e) {
    Logger.log('notifyTelegramUploads error: ' + (e && e.message ? e.message : e));
    return { ok: false, error: String(e) };
  }
}

function getOrCreateFolder_(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(folderName);
}

function toBlob_(f) {
  try {
    if (f && f.base64Data) {
      const bytes = Utilities.base64Decode(f.base64Data);
      const mime = (f.mimeType && (f.mimeType + '').trim()) || 'application/octet-stream';
      const name = (f.name && (f.name + '').trim()) || 'upload.bin';
      return Utilities.newBlob(bytes, mime, name);
    }
  } catch (e) {
    Logger.log('toBlob_ error: ' + e);
  }
  return null;
}

function getBookings(filters = {}) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sh = ss.getSheetByName(SHEET_NAMES.BOOKINGS);
    if (!sh) {
      return ok_({ bookings: [] });
    }

    let bookings = sheetToObjects(sh);
    return ok_({ bookings: bookings });
  } catch (e) {
    Logger.log('getBookings Error: ' + e.toString());
    return fail_('ไม่สามารถดึงข้อมูลการจองได้: ' + e.toString());
  }
}

function getBookingById(payload) {
  try {
    const bookingId = (payload && payload.bookingId) || arguments[0];
    if (!bookingId) return fail_('missing bookingId');

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sh = ss.getSheetByName(SHEET_NAMES.BOOKINGS);
    if (!sh) return fail_('Bookings sheet not found');

    const rows = sheetToObjects(sh);
    const matchedRows = rows.filter(r => String(r.BookingID) === String(bookingId));
    if (matchedRows.length === 0) return fail_('not found');

    // เรียงตามวันที่
    matchedRows.sort((a, b) => {
      const da = parseFlexibleDate(a.BookingDate) || 0;
      const db = parseFlexibleDate(b.BookingDate) || 0;
      return da - db;
    });

    const row = Object.assign({}, matchedRows[0]);
    row.teacherName = row.teacherName || row.TeacherName || row.teacher || row.instructor || row.instructorName || row.lecturer || row.lecturerName || row['อาจารย์ผู้สอน'] || row['ผู้สอน'] || '';

    // ทำความสะอาด/คงเลข 0 เบอร์โทร
    row.PhoneNumber = normalizePhone(row.PhoneNumber);

    // --- FIX: Enhanced Date Formatting for Multi-day ---
    const formattedDates = matchedRows.map(r => {
      if (r.BookingDate) {
        const dateObj = parseFlexibleDate(r.BookingDate);
        return dateObj && !isNaN(dateObj.getTime()) ? formatThaiDateFullHelper(dateObj) : String(r.BookingDate);
      }
      return 'ไม่ระบุวันที่';
    });

    row.formattedDate = formattedDates.join(', ') + (matchedRows.length > 1 ? ` (รวม ${matchedRows.length} วัน)` : '');
    
    // ตั้งค่า isoDate เป็นใบแรกสุด
    if (row.BookingDate) {
      const firstDateObj = parseFlexibleDate(row.BookingDate);
      row.isoDate = firstDateObj && !isNaN(firstDateObj.getTime()) ? formatDateISO(firstDateObj) : '';
    } else {
      row.isoDate = '';
    }

    // แตกอุปกรณ์/ไฟล์แนบเป็นลิสต์ (ถ้ามี)
    row.equipmentList = (row.Equipment ? String(row.Equipment).split(',').map(s => s.trim()).filter(Boolean) : []);
    row.fileLinks = row.UploadedFiles
      ? parseUploadedFiles(String(row.UploadedFiles)).map(function (x) { return String(x.url || '').trim(); }).filter(Boolean)
      : [];

    return ok_(row);
  } catch (e) {
    Logger.log('getBookingById error: ' + e);
    return fail_('ไม่สามารถอ่านรายละเอียดการจองได้');
  }
}

function isTimeOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

function getRoomWeekSchedule(payload) {
  try {
    const { roomId, startDateISO } = payload || {};
    if (!roomId || !startDateISO) return fail_('ข้อมูลไม่ครบถ้วน');

    const startObj = parseFlexibleDate(startDateISO);
    // ปรับให้เป็นวันจันทร์ของสัปดาห์นั้นเสมอ
    const dayIndex = startObj.getDay(); 
    const diffToMon = dayIndex === 0 ? 6 : dayIndex - 1; // 0=Sun
    startObj.setDate(startObj.getDate() - diffToMon);
    startObj.setHours(0,0,0,0);

    const weekDates = [];
    const result = {};

    // วนลูป 5 วัน (จันทร์-ศุกร์) หรือ 7 วันตามต้องการ
    for (let i = 0; i < 5; i++) {
        const curr = new Date(startObj);
        curr.setDate(startObj.getDate() + i);
        const iso = formatDateISO(curr);
        weekDates.push(iso);
        
        // เรียกใช้ฟังก์ชัน getRoomSchedule เดิมที่มีอยู่แล้ว (Reuse Code!)
        const daySchedule = getRoomSchedule({ roomId: roomId, dateISO: iso });
        if (daySchedule.ok) {
            result[iso] = daySchedule.data.slots || [];
        } else {
            result[iso] = [];
        }
    }

    return ok_({
        roomId,
        weekDates,
        schedules: result
    });

  } catch (e) {
    Logger.log('getRoomWeekSchedule Error: ' + e);
    return fail_('ไม่สามารถดึงตารางรายสัปดาห์ได้');
  }
}

function getRoomScheduleRange(payload) {
  try {
    const { roomId: rawRoomId, startDate, endDate } = payload || {};
    if (!rawRoomId || !startDate || !endDate) return fail_('ข้อมูลไม่ครบถ้วน');
    const roomId = String(rawRoomId).trim().toLowerCase();

    const startObj = parseFlexibleDate(startDate);
    const endObj = parseFlexibleDate(endDate);
    
    if (!startObj || !endObj) return fail_('รูปแบบวันที่ไม่ถูกต้อง');

    // ใช้ ISO String (YYYY-MM-DD) เทียบ
    const startISO = formatDateISO(startObj);
    const endISO = formatDateISO(endObj);

    Logger.log(`🔎 Range Query: ${roomId} | ${startISO} -> ${endISO}`);

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const allSlots = [];

    // ==========================================
    // 1. ดึงตารางสอน (Class) - Logic เดิมที่ทำงานถูกแล้ว
    // ==========================================
    const shClass = ss.getSheetByName(SHEET_NAMES.CLASS_SCHEDULE || 'ClassSchedule');
    if (shClass) {
        const rows = shClass.getDataRange().getDisplayValues().slice(1);
        let curr = new Date(startObj); 
        curr.setHours(0,0,0,0);
        const endC = new Date(endObj);
        endC.setHours(23,59,59,999);

        while (curr <= endC) {
            const currISO = formatDateISO(curr);
            const dayIdx = curr.getDay(); // 0=Sun, 6=Sat
            if (dayIdx !== 0 && dayIdx !== 6) {
                rows.forEach(r => {
                    if(String(r[0] || '').trim().toLowerCase() !== roomId) return;
                    const dayNameInSheet = String(r[1]).toLowerCase();
                    if (isDayMatch_(curr, dayNameInSheet)) {
                        const validFrom = parseFlexibleDate(r[6]);
                        const validTo = parseFlexibleDate(r[7]);
                        const validFromISO = validFrom ? formatDateISO(validFrom) : '';
                        const validToISO = validTo ? formatDateISO(validTo) : '';
                        let isValid = true;
                        if (validFromISO && currISO < validFromISO) isValid = false;
                        if (validToISO && currISO > validToISO) isValid = false;

                        if (isValid) {
                            allSlots.push({
                                type: 'class',
                                title: String(r[4] || 'วิชาเรียน'), 
                                instructor: String(r[5] || ''),
                                teacherName: String(r[5] || ''),
                                start: formatTimeFromSheet(r[2]),
                                end: formatTimeFromSheet(r[3]),
                                date: currISO,
                                status: 'class'
                            });
                        }
                    }
                });
            }
            curr.setDate(curr.getDate() + 1);
        }
    }

    // ==========================================
    // 2. ดึงการจอง (Booking) - **ปรับปรุง Logic**
    // ==========================================
    const shBook = ss.getSheetByName(SHEET_NAMES.BOOKINGS || 'Bookings');
    if (shBook) {
        const bRows = sheetToObjects(shBook);
        const allowedStatus = ['รออนุมัติ', 'อนุมัติ', 'pending', 'approved', 'approve'];

        Logger.log(`📂 Found ${bRows.length} total bookings in sheet.`);

        bRows.forEach(b => {
            // 1. Check Room (Trim & Case Insensitive)
            if(String(b.RoomID).trim().toLowerCase() !== roomId) return;
            
            // 2. Check Date
            const bDate = parseFlexibleDate(b.BookingDate);
            if(!bDate) {
               // Logger.log(`⚠️ Invalid Date for BookingID: ${b.BookingID}`);
               return;
            }
            const bISO = formatDateISO(bDate);
            
            // 3. Check Status
            const status = String(b.Status || '').trim().toLowerCase();
            
            // Logic Check
            const inRange = (bISO >= startISO && bISO <= endISO);
            const isStatusOk = allowedStatus.includes(status);

            if (inRange && isStatusOk) {
                Logger.log(`✅ MATCH: Booking ${b.BookingID} on ${bISO}`);
                allSlots.push({
                    type: 'booking',
                    bookingId: String(b.BookingID),
                    title: String(b.Purpose),
                    instructor: String(b.BookerName),
                    teacherName: b.teacherName || b.TeacherName || b.teacher || b.instructor || b.instructorName || b.lecturer || b.lecturerName || b['อาจารย์ผู้สอน'] || b['ผู้สอน'] || '',
                    start: formatTimeFromSheet(b.StartTime),
                    end: formatTimeFromSheet(b.EndTime),
                    date: bISO,
                    status: (status.includes('อนุมัติ') || status === 'approved' || status === 'approve') ? 'approved' : 'pending'
                });
            } 
        });
    }

    // Sort Result
    allSlots.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return String(a.start).localeCompare(String(b.start));
    });

    Logger.log(`📤 Returning ${allSlots.length} slots.`);
    return ok_({ slots: allSlots });

  } catch (e) {
    Logger.log('getRoomScheduleRange Error: ' + e);
    return fail_(e.message);
  }
}


function getRecentBookingsByPhone(phoneNumber) {
  try {
    const phone = normalizePhone(phoneNumber);
    if (!phone) return ok_([]);

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sh = ss.getSheetByName(SHEET_NAMES.BOOKINGS || 'Bookings');
    if (!sh) return ok_([]);

    const rows = sheetToObjects(sh);
    const resultRows = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowPhone = normalizePhone(r.PhoneNumber);
      if (rowPhone === phone) {
        const dObj = parseFlexibleDate(r.BookingDate) || parseFlexibleDate(r.Timestamp);
        const sortTime = dObj && !isNaN(dObj.getTime()) ? dObj.getTime() : 0;
        const dateISO = dObj && !isNaN(dObj.getTime()) ? formatDateISO(dObj) : String(r.BookingDate || '').trim();

        resultRows.push({
          bookingId: String(r.BookingID || '').trim(),
          bookingDate: dateISO,
          roomId: String(r.RoomID || '').trim(),
          startTime: formatTimeFromSheet(r.StartTime),
          status: String(r.Status || '').trim(),
          _sortTime: sortTime
        });
      }
    }

    // เรียงใหม่ → เก่า
    resultRows.sort((a, b) => b._sortTime - a._sortTime);

    return ok_(resultRows.slice(0, 5));
  } catch (e) {
    Logger.log('getRecentBookingsByPhone error: ' + e);
    return ok_([]);
  }
}

function isDayMatch_(dateObj, dayNameInSheet) {
  try {
    if (!dateObj || !dayNameInSheet) return false;

    const targetIdx = new Date(dateObj).getDay(); // 0=Sun..6=Sat
    const raw = String(dayNameInSheet || '').trim();
    if (!raw) return false;

    // ---- Convert token -> day index ----
    const tokenToIndex = (token) => {
      if (token == null) return null;
      let t = String(token).trim().toLowerCase();
      if (!t) return null;

      // normalize punctuation
      t = t.replace(/\./g, '').replace(/\s+/g, '');

      // numeric day support:
      // - allow 0-6 (Sun=0)
      // - allow 1-7 (Mon=1 ... Sun=7)
      if (/^\d+$/.test(t)) {
        const n = Number(t);
        if (n >= 0 && n <= 6) return n;
        if (n >= 1 && n <= 7) return (n % 7); // 7 -> 0 (Sun)
      }

      // english short/long
      const eng = {
        sun: 0, sunday: 0,
        mon: 1, monday: 1,
        tue: 2, tues: 2, tuesday: 2,
        wed: 3, wednesday: 3,
        thu: 4, thur: 4, thurs: 4, thursday: 4,
        fri: 5, friday: 5,
        sat: 6, saturday: 6
      };
      if (eng[t] != null) return eng[t];

      // thai full / short
      const th = {
        'อาทิตย์': 0, 'อา': 0, 'อาา': 0, 'อา.': 0, 'อาทิตย์.': 0,
        'จันทร์': 1, 'จ': 1, 'จ.': 1,
        'อังคาร': 2, 'อ': 2, 'อ.': 2,
        'พุธ': 3, 'พ': 3, 'พ.': 3,
        'พฤหัสบดี': 4, 'พฤ': 4, 'พฤ.': 4, 'พฤหัส': 4, 'phu': 4,
        'ศุกร์': 5, 'ศ': 5, 'ศ.': 5,
        'เสาร์': 6, 'ส': 6, 'ส.': 6
      };

      // IMPORTANT: ต้อง match แบบ "เท่ากัน" เท่านั้น (ห้าม includes)
      // เพื่อกัน "พฤ" ไปโดน "พ" หรือ "พุธ"
      if (th[t] != null) return th[t];

      return null;
    };

    // split by comma/space/slash
    const tokens = raw.split(/[,\s/]+/).map(s => s.trim()).filter(Boolean);

    // build list of indexes from tokens
    const idxList = [];
    tokens.forEach(tok => {
      const idx = tokenToIndex(tok);
      if (idx != null) idxList.push(idx);
    });

    // ถ้าชีตเก็บเป็นข้อความเดียว เช่น "พฤหัสบดี" ไม่แตก token ได้ก็ยังรองรับ
    if (!idxList.length) {
      const single = tokenToIndex(raw);
      if (single != null) idxList.push(single);
    }

    return idxList.includes(targetIdx);
  } catch (e) {
    Logger.log('isDayMatch_ error: ' + e);
    return false;
  }
}


function getCombinedSchedule(payload) {
  try {
    const dateISO = payload && payload.dateISO ? String(payload.dateISO).trim() : '';
    if (!dateISO) return fail_('กรุณาระบุ dateISO');

    const targetDate = parseFlexibleDate(dateISO);
    if (!targetDate) return fail_('รูปแบบวันที่ไม่ถูกต้อง');

    targetDate.setHours(0, 0, 0, 0);
    const dayISO = formatDateISO(targetDate);

    const toMinutes = (t) => {
      if (t == null) return null;
      const s = String(t).trim();
      if (!s) return null;
      const m = s.match(/^(\d{1,2})[:.](\\d{2})$/);
      if (!m) return null;
      const hh = Number(m[1]);
      const mm = Number(m[2]);
      if (isNaN(hh) || isNaN(mm)) return null;
      return hh * 60 + mm;
    };

    const isOverlap = (aStart, aEnd, bStart, bEnd) => {
      const as = toMinutes(aStart);
      const ae = toMinutes(aEnd);
      const bs = toMinutes(bStart);
      const be = toMinutes(bEnd);
      if (as == null || ae == null || bs == null || be == null) return false;
      return as < be && bs < ae;
    };

    const ss = SpreadsheetApp.openById(SHEET_ID);

    // 1) BOOKINGS (ทุกห้อง) เฉพาะวันเดียว
    const shBookings = ss.getSheetByName(SHEET_NAMES.BOOKINGS || 'Bookings');
    const bookingRows = shBookings ? sheetToObjects(shBookings) : [];

    const bookings = bookingRows
      .filter(b => {
        const bDate = parseFlexibleDate(b.BookingDate);
        if (!bDate) return false;
        bDate.setHours(0, 0, 0, 0);

        const sameDay = formatDateISO(bDate) === dayISO;
        if (!sameDay) return false;

        const st = String(b.Status || '').trim();
        // ให้โชว์ “รออนุมัติ/อนุมัติ” ในตารางรวม (รายการอื่นไม่ต้องโชว์)
        return ['รออนุมัติ', 'อนุมัติ'].includes(st);
      })
      .map(b => {
        const statusThai = String(b.Status || '').trim();
        const status = (statusThai === 'อนุมัติ') ? 'approved' : 'pending';

        return {
          type: 'booking',
          status,
          bookingId: String(b.BookingID || ''),
          roomId: String(b.RoomID || '').trim(),
          title: String(b.Purpose || '-'),
          subject: String(b.Purpose || '-'),
          instructor: '',
          booker: String(b.BookerName || ''),
          teacherName: b.teacherName || b.TeacherName || b.teacher || b.instructor || b.instructorName || b.lecturer || b.lecturerName || b['อาจารย์ผู้สอน'] || b['ผู้สอน'] || '',
          start: formatTimeFromSheet(b.StartTime),
          end: formatTimeFromSheet(b.EndTime),
          date: dayISO
        };
      });

    const approvedBookings = bookings.filter(x => x.status === 'approved');

    // 2) CLASSES (ทุกห้อง) เฉพาะวันเดียว
    const dayIndex = targetDate.getDay();
    const daysMap = [
      ['อาทิตย์', 'Sun', 'Sunday', 'อา.'],
      ['จันทร์', 'Mon', 'Monday', 'จ.'],
      ['อังคาร', 'Tue', 'Tuesday', 'อ.'],
      ['พุธ', 'Wed', 'Wednesday', 'พ.'],
      ['พฤหัสบดี', 'Thu', 'Thursday', 'พฤ.', 'Phu'],
      ['ศุกร์', 'Fri', 'Friday', 'ศ.'],
      ['เสาร์', 'Sat', 'Saturday', 'ส.']
    ];
    const targetDayKeywords = daysMap[dayIndex];

    const shClass = ss.getSheetByName(SHEET_NAMES.CLASS_SCHEDULE || 'ClassSchedule');
    const classRows = shClass ? shClass.getDataRange().getDisplayValues().slice(1) : [];

    const classesRaw = classRows
      .filter(row => {
        const roomId = String(row[0] || '').trim();
        if (!roomId) return false;

        const classDay = String(row[1] || '').toLowerCase();
        const isDayMatch = targetDayKeywords.some(kw => classDay.includes(String(kw).toLowerCase()));
        if (!isDayMatch) return false;

        const validFrom = parseFlexibleDate(row[6]);
        const validTo = parseFlexibleDate(row[7]);
        const validFromISO = validFrom ? formatDateISO(validFrom) : '';
        const validToISO = validTo ? formatDateISO(validTo) : '';
        if (validFromISO && dayISO < validFromISO) return false;
        if (validToISO && dayISO > validToISO) return false;
        return true;
      })
      .map(row => ({
        type: 'class',
        status: 'class',
        roomId: String(row[0] || '').trim(),
        title: String(row[4] || 'วิชาเรียน'),
        subject: String(row[4] || 'วิชาเรียน'),
        instructor: String(row[5] || ''),
        teacherName: String(row[5] || ''),
        start: formatTimeFromSheet(row[2]),
        end: formatTimeFromSheet(row[3]),
        date: dayISO
      }));

    // 3) กันคาบ “เรียน” ที่ถูกจองทับด้วย “อนุมัติแล้ว”
    const classes = classesRaw.filter(cls => {
      const hit = approvedBookings.some(bk => {
        if (String(bk.roomId) !== String(cls.roomId)) return false;
        return isOverlap(cls.start, cls.end, bk.start, bk.end);
      });
      return !hit;
    });

    // 4) รวม + sort
    const slots = classes.concat(bookings).sort((a, b) => {
      const roomA = String(a.roomId || '');
      const roomB = String(b.roomId || '');
      if (roomA !== roomB) return roomA.localeCompare(roomB);
      return String(a.start || '').localeCompare(String(b.start || ''));
    });

    return ok_({
      date: dayISO,
      slots,
      summary: {
        total: slots.length,
        class: classes.length,
        bookings: bookings.length
      }
    });

  } catch (e) {
    Logger.log('getCombinedSchedule error: ' + e);
    return fail_('ไม่สามารถดึงตารางเรียนรวมได้: ' + (e && e.message ? e.message : e));
  }
}

// ANCHOR:SERVER.getCombinedScheduleWeek:REPLACE
function getCombinedScheduleWeek(payload) {
  try {
    // 1. รับค่า Date และ Config Timezone
    var tz = Session.getScriptTimeZone();
    var paramDate = payload && payload.date ? String(payload.date) : '';
    
    // Helper: แปลง Date Object หรือ String ให้เป็น Date Object ที่เที่ยงคืน
    var parseToDateObj = function(v) {
      if (!v) return new Date();
      if (v instanceof Date) return new Date(v);
      // รองรับ YYYY-MM-DD
      var parts = String(v).split('T')[0].split('-');
      if (parts.length === 3) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      }
      return new Date(v);
    };

    var baseDate = parseToDateObj(paramDate);
    
    // 2. คำนวณช่วงเวลา จันทร์ - อาทิตย์ ของสัปดาห์ที่เลือก
    // ปรับให้เป็นวันจันทร์ (Monday based)
    var day = baseDate.getDay(); // 0=Sun, 1=Mon
    var diff = baseDate.getDate() - day + (day === 0 ? -6 : 1); 
    
    var monday = new Date(baseDate);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0); // Start of Mon

    var sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999); // End of Sun

    var rangeStartISO = Utilities.formatDate(monday, tz, 'yyyy-MM-dd');
    var rangeEndISO = Utilities.formatDate(sunday, tz, 'yyyy-MM-dd');

    var cache = CacheService.getScriptCache();
    var cacheKey = 'getCombinedScheduleWeek_' + rangeStartISO + '_' + rangeEndISO;
    var cachedData = cache.get(cacheKey);
    if (cachedData) {
      try {
        var parsed = JSON.parse(cachedData);
        Logger.log('getCombinedScheduleWeek: returned from CacheService for key ' + cacheKey);
        return ok_(parsed);
      } catch (err) {
        // Continue
      }
    }

    // Helper: Format เป็น YYYY-MM-DD
    var toIsoDate = function(d) {
      return (d instanceof Date) ? Utilities.formatDate(d, tz, 'yyyy-MM-dd') : '';
    };

    // Helper: Safely Get String
    var safeStr = function(v) { return String(v == null ? '' : v).trim(); };
    var normalizeHeader = function(v) {
      return safeStr(v).toLowerCase().replace(/[\s_\-]/g, '');
    };
    var findHeaderIndex = function(header, aliases) {
      var normalized = header.map(normalizeHeader);
      for (var i = 0; i < aliases.length; i++) {
        var idx = normalized.indexOf(normalizeHeader(aliases[i]));
        if (idx >= 0) return idx;
      }
      return -1;
    };
    var getCellByIndex = function(row, idx, fallbackIdx) {
      if (idx >= 0) return row[idx];
      return fallbackIdx >= 0 ? row[fallbackIdx] : '';
    };

    // 3. เตรียมข้อมูล
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var slots = [];

    // --- A. ดึงข้อมูล BOOKINGS ---
    var shBook = ss.getSheetByName('Bookings');
    if (shBook) {
      var dataB = sheetToObjects(shBook); // ใช้ Helper เดิมที่มี
      dataB.forEach(function(row) {
        // เช็คสถานะ
        var status = safeStr(row.Status).toLowerCase();
        if (status === 'ยกเลิก' || status === 'cancel' || status === 'cancelled' || status === 'ไม่อนุมัติ' || status === 'rejected') return;

        // แปลงวันที่จอง
        var bDate = row.BookingDate;
        if (!bDate) return;
        
        // ถ้าเป็น Date Object ให้ Format, ถ้าเป็น String ให้ Parse
        var bDateObj = (bDate instanceof Date) ? bDate : parseFlexibleDate(bDate);
        if (!bDateObj) return;

        var bDateISO = toIsoDate(bDateObj);

        // Filter ช่วงเวลา
        if (bDateISO >= rangeStartISO && bDateISO <= rangeEndISO) {
           slots.push({
             type: 'booking',
             bookingId: String(row.BookingID),
             roomId: String(row.RoomID),
             title: safeStr(row.Purpose),
             booker: safeStr(row.BookerName),
             teacherName: row.teacherName || row.TeacherName || row.teacher || row.instructor || row.instructorName || row.lecturer || row.lecturerName || row['อาจารย์ผู้สอน'] || row['ผู้สอน'] || '',
             start: formatTimeFromSheet(row.StartTime),
             end: formatTimeFromSheet(row.EndTime),
             date: bDateISO,
             status: (status === 'อนุมัติ' || status === 'approved') ? 'approved' : 'pending',
             // เพิ่ม field สำหรับตรวจรายละเอียด
             hasDetails: !!(row.Remark || row.Equipment || row.UploadedFiles)
           });
        }
      });
    }

    // --- B. ดึงข้อมูล CLASS SCHEDULE ---
    var shClass = ss.getSheetByName('ClassSchedule');
    if (shClass) {
      var rowsC = shClass.getDataRange().getDisplayValues(); // ใช้ DisplayValues เพื่อความง่าย
      var classHeader = rowsC.length ? rowsC[0] : [];
      var idxRoom = findHeaderIndex(classHeader, ['RoomID', 'Room']);
      var idxDay = findHeaderIndex(classHeader, ['Day', 'DayOfWeek', 'Weekday']);
      var idxStart = findHeaderIndex(classHeader, ['StartTime', 'Start']);
      var idxEnd = findHeaderIndex(classHeader, ['EndTime', 'End']);
      var idxSubject = findHeaderIndex(classHeader, ['Subject', 'SubjectName', 'Title']);
      var idxInstructor = findHeaderIndex(classHeader, ['Instructor', 'Teacher', 'Lecturer']);
      var idxValidFrom = findHeaderIndex(classHeader, ['ValidFrom', 'StartDate', 'TermStartDate', 'TermStart']);
      var idxValidTo = findHeaderIndex(classHeader, ['ValidTo', 'EndDate', 'TermEndDate', 'TermEnd']);
      // Skip Header
      for (var i = 1; i < rowsC.length; i++) {
        var r = rowsC[i];
        // Col Index: 0=RoomID, 1=Day, 2=Start, 3=End, 4=Subject, 5=Instructor, 6=ValidFrom, 7=ValidTo
        var dayName = safeStr(getCellByIndex(r, idxDay, 1)).toLowerCase();
        
        // Mapping วัน (1=Mon ... 7=Sun)
        var dayOffset = -1;
        if (dayName.includes('จันทร์') || dayName.includes('mon')) dayOffset = 0;
        else if (dayName.includes('อังคาร') || dayName.includes('tue')) dayOffset = 1;
        else if (dayName.includes('พุธ') || dayName.includes('wed')) dayOffset = 2;
        else if (dayName.includes('พฤหัส') || dayName.includes('thu')) dayOffset = 3;
        else if (dayName.includes('ศุกร์') || dayName.includes('fri')) dayOffset = 4;
        else if (dayName.includes('เสาร์') || dayName.includes('sat')) dayOffset = 5;
        else if (dayName.includes('อาทิตย์') || dayName.includes('sun')) dayOffset = 6;

        if (dayOffset === -1) continue;

        // คำนวณวันที่จริงของ Class ในสัปดาห์นี้
        var classDate = new Date(monday);
        classDate.setDate(monday.getDate() + dayOffset);
        var classDateISO = toIsoDate(classDate);

        // Check Valid Period (ถ้ามี)
        var validFrom = parseFlexibleDate(getCellByIndex(r, idxValidFrom, 6));
        var validTo = parseFlexibleDate(getCellByIndex(r, idxValidTo, 7));
        var validFromISO = validFrom ? toIsoDate(validFrom) : '';
        var validToISO = validTo ? toIsoDate(validTo) : '';
        if (validFromISO && classDateISO < validFromISO) continue;
        if (validToISO && classDateISO > validToISO) continue;

        slots.push({
          type: 'class',
          roomId: safeStr(getCellByIndex(r, idxRoom, 0)),
          title: safeStr(getCellByIndex(r, idxSubject, 4)),
          subject: safeStr(getCellByIndex(r, idxSubject, 4)),
          instructor: safeStr(getCellByIndex(r, idxInstructor, 5)),
          teacherName: safeStr(getCellByIndex(r, idxInstructor, 5)),
          start: formatTimeFromSheet(getCellByIndex(r, idxStart, 2)),
          end: formatTimeFromSheet(getCellByIndex(r, idxEnd, 3)),
          date: classDateISO,
          status: 'class'
        });
      }
    }

    // --- C. กันคาบ "เรียน" ที่ถูกจองทับด้วย booking ที่อนุมัติแล้ว ---
    var approvedBookings = slots.filter(function(s) {
      return s.type === 'booking' && s.status === 'approved';
    });
    if (approvedBookings.length > 0) {
      var toMin = function(t) {
        var s = safeStr(t);
        var m = s.match(/^(\d{1,2})[:.:](\d{2})/);
        if (!m) return null;
        return Number(m[1]) * 60 + Number(m[2]);
      };
      var isOverlap = function(aStart, aEnd, bStart, bEnd) {
        var as = toMin(aStart), ae = toMin(aEnd);
        var bs = toMin(bStart), be = toMin(bEnd);
        if (as == null || ae == null || bs == null || be == null) return false;
        return as < be && bs < ae;
      };
      slots = slots.filter(function(s) {
        if (s.type !== 'class') return true;
        var hit = approvedBookings.some(function(bk) {
          if (bk.roomId !== s.roomId) return false;
          if (bk.date !== s.date) return false;
          return isOverlap(s.start, s.end, bk.start, bk.end);
        });
        return !hit;
      });
    }

    // 4. Sort ข้อมูล (Date -> Room -> StartTime)
    slots.sort(function(a, b) {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.roomId !== b.roomId) return a.roomId.localeCompare(b.roomId);
      return a.start.localeCompare(b.start);
    });

    var responseData = {
      weekKey: rangeStartISO,
      range: { start: rangeStartISO, end: rangeEndISO },
      slots: slots
    };
    try {
      cache.put(cacheKey, JSON.stringify(responseData), 120); // TTL 120 วินาที
    } catch (err) {
      Logger.log('Cache put error: ' + err);
    }
    return ok_(responseData);

  } catch (e) {
    Logger.log('getCombinedScheduleWeek Error: ' + e);
    return fail_('Failed to fetch schedule: ' + e.message);
  }
}
// ANCHOR:SERVER.getCombinedScheduleWeek:END


/* ===== helpers (ใช้จริง) ===== */

function parseISODate_(iso) {
  const m = String(iso || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (Number.isNaN(dt.getTime())) return null;
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function toISODate_(dt) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

function normalizeToDate_(v) {
  if (!v) return null;

  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return new Date(v.getFullYear(), v.getMonth(), v.getDate());
  }

  const s = String(v).trim();

  // รองรับ YYYY-MM-DD
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));

  // รองรับ DD/MM/YYYY และ DD/MM/YY (บางที่)
  const dm = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (dm) {
    let y = Number(dm[3]);
    if (y < 100) y = 2000 + y;
    return new Date(y, Number(dm[2]) - 1, Number(dm[1]));
  }

  // รองรับค่าเป็น serial number ของ Google Sheets
  if (!Number.isNaN(Number(s))) {
    const n = Number(s);
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const dt = new Date(epoch.getTime() + n * 24 * 60 * 60 * 1000);
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  }

  const tryDt = new Date(s);
  if (!Number.isNaN(tryDt.getTime())) {
    return new Date(tryDt.getFullYear(), tryDt.getMonth(), tryDt.getDate());
  }

  return null;
}

function formatTimeCell_(v) {
  if (!v) return '';
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const hh = String(v.getHours()).padStart(2, '0');
    const mm = String(v.getMinutes()).padStart(2, '0');
    return hh + ':' + mm;
  }
  const s = String(v).trim();
  // ถ้าเป็น 8:00 หรือ 08:00:00
  const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (m) return String(m[1]).padStart(2, '0') + ':' + m[2];
  return s;
}


// ANCHOR:SERVER.getStatistics:REPLACE
function getStatistics(payload) {
  try {
    const rawPeriod = payload && payload.period != null ? String(payload.period) : 'week';
    const period = String(rawPeriod).trim().toLowerCase();
    const p = (period === 'week' || period === 'month' || period === 'year') ? period : 'week';

    const baseDateStr = payload && payload.baseDate != null ? String(payload.baseDate).trim() : '';
    const baseDateObj = parseFlexibleDate(baseDateStr) || new Date();
    baseDateObj.setHours(0, 0, 0, 0);

    const filterRoomId = payload && payload.roomId != null ? String(payload.roomId).trim() : '';

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const shBookings = ss.getSheetByName(SHEET_NAMES.BOOKINGS);
    const bookings = shBookings ? sheetToObjects(shBookings) : [];

    const statsMap = {};

    // --- กรณีเลือก "รายปี" (Year) : ดึงข้อมูลทุกปีที่มีในระบบ ---
    if (p === 'year') {
       bookings.forEach(b => {
          const st = String(b.Status || '').trim();
          // กรองสถานะที่ไม่นับ
          if (!b.BookingDate || st === 'ยกเลิก' || st === 'ไม่อนุมัติ') return;

          const rId = String(b.RoomID || b.roomId || '').trim();
          if (filterRoomId && rId !== filterRoomId) return;

          const d = parseFlexibleDate(String(b.BookingDate).trim());
          if (!d || isNaN(d.getTime())) return;
          
          // ใช้ปี ค.ศ. เป็น Key (เช่น "2025", "2026")
          const yearKey = String(d.getFullYear());
          
          // สร้างวันที่ตัวแทน (วันที่ 1 ม.ค. ของปีนั้น) เพื่อให้ Client เรียงลำดับได้
          const sortDate = `${yearKey}-01-01`;

          if (!statsMap[yearKey]) {
              statsMap[yearKey] = { date: sortDate, label: yearKey, bookingCount: 0 };
          }
          statsMap[yearKey].bookingCount++;
       });

       // เรียงลำดับตามปี (จากอดีต -> อนาคต)
       const sortedData = Object.values(statsMap).sort((a, b) => {
          return Number(a.label) - Number(b.label);
       });
       
       return ok_({ chartData: sortedData });
    }

    // --- กรณีเลือก "รายสัปดาห์/รายเดือน" : ดึงตามช่วงวันที่เลือก (สัปดาห์นี้ = ย้อนหลัง 3 วัน + วันที่เลือก + ล่วงหน้า 3 วัน, เดือนนี้ = ย้อนหลัง 15 วัน + วันที่เลือก + ล่วงหน้า 14 วัน) ---
    const isMonth = (p === 'month');
    const startOffset = isMonth ? -15 : -3;
    const endOffset = isMonth ? 14 : 3;
    
    // สร้างแกน X (วันที่) รอบวันที่เลือก
    for (let i = startOffset; i <= endOffset; i++) {
      const d = new Date(baseDateObj);
      d.setDate(baseDateObj.getDate() + i);
      const k = formatDateISO(d);
      statsMap[k] = { date: k, bookingCount: 0 };
    }

    // เติมข้อมูลลงในวันที่
    bookings.forEach(b => {
      const st = String(b.Status || '').trim();
      if (!b.BookingDate || st === 'ยกเลิก' || st === 'ไม่อนุมัติ') return;

      const rId = String(b.RoomID || b.roomId || '').trim();
      if (filterRoomId && rId !== filterRoomId) return;

      const d = parseFlexibleDate(String(b.BookingDate).trim());
      if (!d || isNaN(d.getTime())) return;
      d.setHours(0, 0, 0, 0);

      const k = formatDateISO(d);
      if (statsMap[k]) statsMap[k].bookingCount++;
    });

    return ok_({ chartData: Object.values(statsMap) });

  } catch (e) {
    Logger.log('getStatistics error: ' + e);
    return ok_({ chartData: [] });
  }
}
// ANCHOR:SERVER.getStatistics:END


function mergeSlotsWithPriority_(classSlots, bookingSlots) {
  const result = [...classSlots];
  const overlap = (a, b) => !(a.end <= b.start || b.end <= a.start);

  bookingSlots.forEach(b => {
    let didOverride = false;
    for (let i = result.length - 1; i >= 0; i--) {
      if (result[i].type === 'class' && overlap(result[i], b)) {
        result.splice(i, 1); // Remove the class that is being overridden
        didOverride = true;
      }
    }
    if (didOverride) {
      b.isOverride = true; // Add a flag to the booking object
    }
  });

  return [...result, ...bookingSlots];
}
// ANCHOR:SERVER.mergeSlots:END

function getById(bookingId) {
  try {
    if (!bookingId) return fail_('missing bookingId');

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sh = ss.getSheetByName(SHEET_NAMES.BOOKINGS);
    const rows = sheetToObjects(sh);
    const row = rows.find(r => String(r.BookingID) === String(bookingId));
    if (!row) return fail_('ไม่พบบันทึกการจอง');

    let formattedDate = '';
    if (row.BookingDate) {
      const d = parseFlexibleDate(row.BookingDate) || (row.BookingDate instanceof Date ? row.BookingDate : new Date(row.BookingDate));
      if (d && !isNaN(d.getTime())) formattedDate = formatDateISO(d);
    }

    const fileLinks = String(row.UploadedFiles || '').trim()
      ? parseUploadedFiles(String(row.UploadedFiles)).map(function (x) { return String(x.url || '').trim(); }).filter(Boolean)
      : [];

    return ok_({
      ...row,
      teacherName: row.teacherName || row.TeacherName || row.teacher || row.instructor || row.instructorName || row.lecturer || row.lecturerName || row['อาจารย์ผู้สอน'] || row['ผู้สอน'] || '',
      PhoneNumber: normalizePhone(row.PhoneNumber),
      formattedDate,
      fileLinks,
      Software: row.Software || '',
      MeetingLink: row.MeetingLink || ''
    });

  } catch (e) {
    Logger.log('getById error: ' + e);
    return fail_('ไม่สามารถอ่านรายละเอียดการจองได้');
  }
}


// --- [NEW UTILITY FUNCTION] ---
// เพิ่มฟังก์ชันนี้ แล้วกด "Run" 1 ครั้งจากใน Editor เพื่อล้าง Cache ที่ค้างอยู่ทันที
function MANUAL_CLEAR_ROOMS_CACHE() {
  try {
    const c = CacheService.getScriptCache();
    c.remove('rooms_json');
    c.remove('rooms_json_v2');
    Logger.log('SUCCESS: Cache rooms_json / rooms_json_v2 cleared.');
    Browser.msgBox('สำเร็จ', 'Cache ข้อมูลห้องถูกล้างแล้ว กรุณารีเฟรช Web App ครับ', Browser.Buttons.OK);
  } catch (e) {
    Logger.log('FAILED to clear cache: ' + e);
    Browser.msgBox('ล้มเหลว', 'ไม่สามารถล้าง Cache ได้: ' + e, Browser.Buttons.OK);
  }
}

function createBooking(payload, options) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    const data = (payload && typeof payload === 'object') ? payload : {};
    const opt = (options && typeof options === 'object') ? options : {};
    const skipTelegram = opt.skipTelegram === true;
    const isDryRun = opt.isDryRun === true;

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sh = ss.getSheetByName((SHEET_NAMES && SHEET_NAMES.BOOKINGS) ? SHEET_NAMES.BOOKINGS : 'Bookings');
    if (!sh) return fail_('ไม่พบชีต Bookings');

    const values = sh.getDataRange().getValues();
    if (!values || values.length < 1) return fail_('ชีต Bookings ไม่มีหัวตาราง');

    const headers = values[0].map(h => String(h || '').trim());
    const col = {};
    headers.forEach((h, i) => { if (h) col[h] = i; });

    const required = [
      'BookingID','Timestamp','BookerName','PhoneNumber','RoomID','Attendees',
      'StartTime','EndTime','Purpose','Equipment','Software','MeetingLink',
      'UploadedFiles','Status','ApprovedBy','Remark','Remind','BookingDate',
      'CancelAt','CancelledBy'
    ];
    const missing = required.filter(h => col[h] == null);
    if (missing.length) return fail_('โครงสร้างชีต Bookings ไม่ครบคอลัมน์: ' + missing.join(', '));

    const tz = 'Asia/Bangkok';

    const normalizeTimeText = (v) => {
      if (v == null || v === '') return '';

      if (v instanceof Date && !isNaN(v.getTime())) {
        return Utilities.formatDate(v, tz, 'HH:mm');
      }

      if (typeof v === 'number' && isFinite(v)) {
        const totalMin = Math.round(v * 24 * 60);
        const hh = Math.floor(totalMin / 60) % 24;
        const mm = totalMin % 60;
        return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
      }

      const s = String(v).trim().replace('.', ':');
      if (!s) return '';

      const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
      if (m) {
        const hh = String(Math.min(23, Math.max(0, Number(m[1])))).padStart(2, '0');
        const mm = String(Math.min(59, Math.max(0, Number(m[2])))).padStart(2, '0');
        return hh + ':' + mm;
      }

      const dt = new Date(s);
      if (!isNaN(dt.getTime())) {
        return Utilities.formatDate(dt, tz, 'HH:mm');
      }

      return s;
    };

    const toMinutes = (t) => {
      const s = String(t || '').trim();
      const m = s.match(/^(\d{1,2})[:.](\d{2})$/);
      if (!m) return null;
      const hh = Number(m[1]);
      const mm = Number(m[2]);
      if (isNaN(hh) || isNaN(mm)) return null;
      return hh * 60 + mm;
    };

    const bookerName = String(data.bookerName || data.BookerName || '').trim();
    const phoneNumber = normalizePhone(String(data.phoneNumber || data.PhoneNumber || '').trim());
    const roomId = String(data.roomId || data.RoomID || '').trim();

    const attendeesRaw = (data.attendees != null ? data.attendees : data.Attendees);
    const attendees = String(attendeesRaw == null || String(attendeesRaw).trim() === '' ? '1' : attendeesRaw).trim();

    const purpose = String(data.purpose || data.Purpose || '').trim();

    const bookingDateRaw = data.bookingDate || data.BookingDate || data.dateISO || data.DateISO || '';
    const rawDates = (data.bookingDates && Array.isArray(data.bookingDates)) ? data.bookingDates : [bookingDateRaw];
    const dateObjects = rawDates.map(d => parseFlexibleDate(d)).filter(d => d && !isNaN(d.getTime()));

    const startTimeText = normalizeTimeText(data.startTime || data.StartTime);
    const endTimeText = normalizeTimeText(data.endTime || data.EndTime);

    const software = String(data.software || data.Software || '').trim();
    const meetingLink = String(data.meetingLink || data.MeetingLink || '').trim();
    const uploadedFiles = String(data.uploadedFiles || data.UploadedFiles || '').trim();
    const remarks = String(data.remarks || data.Remark || '').trim();

    let equipment = data.equipment != null ? data.equipment : data.Equipment;
    let equipmentText = '-';
    if (Array.isArray(equipment)) {
      equipmentText = equipment.map(x => String(x || '').trim()).filter(Boolean).join(', ') || '-';
    } else if (equipment != null && String(equipment).trim() !== '') {
      equipmentText = String(equipment).trim();
    }

    if (!bookerName) return fail_('กรุณาระบุชื่อผู้จอง');
    if (!phoneNumber) return fail_('กรุณาระบุเบอร์โทรศัพท์');
    if (!roomId) return fail_('กรุณาเลือกห้อง');
    if (!purpose) return fail_('กรุณาระบุวัตถุประสงค์');
    if (!dateObjects.length) return fail_('รูปแบบวันที่ไม่ถูกต้อง');
    if (!startTimeText || !endTimeText) return fail_('กรุณาระบุเวลาเริ่มและเวลาสิ้นสุด');

    const sMin = toMinutes(startTimeText);
    const eMin = toMinutes(endTimeText);
    if (sMin == null || eMin == null) return fail_('รูปแบบเวลาไม่ถูกต้อง (ควรเป็น HH:mm)');
    if (eMin <= sMin) return fail_('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่ม');

    const isConflictStatus = (st) => {
      const norm = (typeof normalizeBookingStatus === 'function')
        ? normalizeBookingStatus(st)
        : String(st || '').trim();
      return norm === 'รออนุมัติ' || norm === 'อนุมัติ';
    };

    const rows = values.slice(1);
    const now = new Date();
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    const bookingId = 'BK-' + Utilities.formatDate(now, tz, 'yyyyMMddHHmmss') + ms;

    let isGroupConflict = false;
    let groupWarningMsgs = [];

    // วนลูปสร้างแถวสำหรับแต่ละวัน
    const rowsToAppend = [];
    dateObjects.forEach(dateObj => {
      dateObj.setHours(0, 0, 0, 0);
      const bookingISO = formatDateISO(dateObj);

      // Check overlap กับ Bookings อื่น
      const hasOverlap = rows.some(r => {
        const rRoom = String(r[col.RoomID] || '').trim();
        if (rRoom !== roomId) return false;

        const rStatus = r[col.Status];
        if (!isConflictStatus(rStatus)) return false;

        const d = parseFlexibleDate(r[col.BookingDate]);
        if (!d || isNaN(d.getTime())) return false;
        d.setHours(0, 0, 0, 0);
        if (formatDateISO(d) !== bookingISO) return false;

        const rs = toMinutes(normalizeTimeText(r[col.StartTime]));
        const re = toMinutes(normalizeTimeText(r[col.EndTime]));
        if (rs == null || re == null) return false;

        return (sMin < re && rs < eMin);
      });

      let bookingStatus = 'รออนุมัติ';
      let warningMsg = '';
      let isConflict = false;

      if (hasOverlap) {
        bookingStatus = 'รออนุมัติ';
        warningMsg = 'ช่วงเวลานี้มีการจองอยู่แล้ว (บันทึกเป็นคำขอจองชน)';
        isConflict = true;
        isGroupConflict = true;
      }

      // Check collision กับ ClassSchedule
      if (!isConflict && typeof detectClassCollisionForBooking_ === 'function') {
        const classCollision = detectClassCollisionForBooking_({
          roomId: roomId,
          bookingDate: dateObj,
          startTime: startTimeText,
          endTime: endTimeText
        });

        if (classCollision && classCollision.isCollision) {
          bookingStatus = 'รออนุมัติ';
          warningMsg = 'ชนตารางเรียน: ' + (classCollision.subject || '-') + ' (บันทึกเป็นคำขอจองชน)';
          isConflict = true;
          isGroupConflict = true;
        }
      }

      if (warningMsg) {
        groupWarningMsgs.push(`${formatThaiDateFullHelper(dateObj)}: ${warningMsg}`);
      }

      const newRow = new Array(headers.length).fill('');
      newRow[col.BookingID] = bookingId;
      newRow[col.Timestamp] = now;
      newRow[col.BookerName] = bookerName;
      newRow[col.PhoneNumber] = "'" + phoneNumber;
      newRow[col.StartTime] = "'" + startTimeText;
      newRow[col.EndTime] = "'" + endTimeText;
      newRow[col.RoomID] = roomId;
      newRow[col.Attendees] = attendees;
      newRow[col.Purpose] = purpose;
      newRow[col.Equipment] = equipmentText;
      newRow[col.Software] = software;
      newRow[col.MeetingLink] = meetingLink;
      newRow[col.UploadedFiles] = uploadedFiles;
      newRow[col.Status] = bookingStatus;
      newRow[col.ApprovedBy] = '';
      newRow[col.Remark] = remarks + (warningMsg ? ' [System: ' + warningMsg + ']' : '');
      newRow[col.Remind] = '';
      newRow[col.BookingDate] = dateObj;
      newRow[col.CancelAt] = '';
      newRow[col.CancelledBy] = '';

      rowsToAppend.push({ rowData: newRow, dateObj: dateObj });
    });

    // เซ็ต column format และ append แถวทั้งหมดลง Sheet
    try {
      sh.getRange(2, col.PhoneNumber + 1, Math.max(1, sh.getMaxRows() - 1), 1).setNumberFormat('@');
      sh.getRange(2, col.StartTime + 1, Math.max(1, sh.getMaxRows() - 1), 1).setNumberFormat('@');
      sh.getRange(2, col.EndTime + 1, Math.max(1, sh.getMaxRows() - 1), 1).setNumberFormat('@');
    } catch (fmtErr) {
      Logger.log('createBooking:format warning: ' + (fmtErr.message || fmtErr));
    }

    rowsToAppend.forEach(item => {
      sh.appendRow(item.rowData);
    });
    SpreadsheetApp.flush();

    // --- Telegram notify (respect dry-run / skip) ---
    if (!skipTelegram) {
      try {
        const notifyData = {
          BookingID: bookingId,
          BookerName: bookerName,
          PhoneNumber: phoneNumber,
          RoomID: roomId,
          Attendees: attendees,
          StartTime: startTimeText,
          EndTime: endTimeText,
          Purpose: purpose,
          Equipment: equipmentText,
          Software: software,
          MeetingLink: meetingLink,
          UploadedFiles: uploadedFiles,
          BookingDate: dateObjects[0],
          BookingDates: dateObjects,
          Status: 'รออนุมัติ',
          Remark: remarks + (groupWarningMsgs.length ? ' [System: ' + groupWarningMsgs.join(' | ') + ']' : '')
        };

        const notiType = isGroupConflict ? 'Conflict' : 'New';

        Logger.log('createBooking:telegram:START bookingId=' + bookingId + ' dryRun=' + isDryRun);
        const res = sendTelegramNotification(notifyData, notiType, isDryRun);
        Logger.log('createBooking:telegram:END ok=' + (res && res.ok));

        if (res && res.code != null) Logger.log('createBooking:telegram:http=' + res.code);
        if (res && res.error) Logger.log('createBooking:telegram:error=' + res.error);
        if (res && res.response) Logger.log('createBooking:telegram:response=' + res.response);

      } catch (e) {
        Logger.log('Telegram Error(createBooking): ' + (e && e.message ? e.message : e));
      }
    } else {
      Logger.log('[TEST] createBooking skipTelegram=true bookingId=' + bookingId);
    }

    // --- stats ---
    rowsToAppend.forEach(item => {
      try {
        if (typeof updateStatistics === 'function') {
          updateStatistics(roomId, item.dateObj, 'create');
        }
      } catch (e) {
        Logger.log('updateStatistics(createBooking) error: ' + (e && e.message ? e.message : e));
      }
    });

    const finalWarningMsg = groupWarningMsgs.join('\n');
    return ok_({
      bookingId: bookingId,
      message: isGroupConflict ? finalWarningMsg : 'บันทึกการจองสำเร็จ',
      isConflict: isGroupConflict,
      status: 'รออนุมัติ'
    });

  } catch (e) {
    Logger.log('createBooking error: ' + e);
    return fail_('บันทึกข้อมูลไม่สำเร็จ: ' + (e && e.message ? e.message : e));
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}


function approveBooking(payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    const data = (payload && typeof payload === 'object') ? payload : {};
    const bookingId = String(data.bookingId || data.BookingID || '').trim();
    const isOverride = !!data.isOverride; // [NEW] รับ Flag Override

    if (!bookingId) return fail_('กรุณาระบุ bookingId');

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sh = ss.getSheetByName(SHEET_NAMES.BOOKINGS || 'Bookings');
    if (!sh) return fail_('ไม่พบชีต Bookings');

    const values = sh.getDataRange().getValues();
    if (!values || values.length < 2) return fail_('ไม่พบข้อมูลการจอง');

    const headers = values[0].map(h => String(h || '').trim());
    const col = {};
    headers.forEach((h, i) => { if (h) col[h] = i; });

    const userProps = PropertiesService.getUserProperties();
    const actor = String(data.actor || data.ApprovedBy || userProps.getProperty('session_displayname') || 'Admin').trim();

    let foundRows = [];
    for (let r = 1; r < values.length; r++) {
      if (String(values[r][col.BookingID] || '').trim() === bookingId) {
        let targetBooking = {};
        headers.forEach((h, i) => targetBooking[h] = values[r][i]);
        foundRows.push({ rowIndex: r + 1, rowData: targetBooking });
      }
    }
    if (foundRows.length === 0) return fail_('ไม่พบรายการจองนี้');

    // --- CONFLICT DOUBLE CHECK FOR ALL ROWS ---
    for (let i = 0; i < foundRows.length; i++) {
      const targetBooking = foundRows[i].rowData;
      const targetDate = parseFlexibleDate(targetBooking.BookingDate);
      const targetStart = toMinutes(formatTimeFromSheet(targetBooking.StartTime));
      const targetEnd = toMinutes(formatTimeFromSheet(targetBooking.EndTime));
      const targetRoom = String(targetBooking.RoomID || '').trim();

      if (targetDate && targetStart !== null && targetEnd !== null) {
         const targetISO = formatDateISO(targetDate);
         const collision = values.slice(1).some((r, idx) => {
            if ((idx + 2) === foundRows[i].rowIndex) return false; // ไม่เช็คตัวเอง
            const rStatus = String(r[col.Status] || '').trim();
            if (rStatus !== 'อนุมัติ') return false; 
            
            const rRoom = String(r[col.RoomID] || '').trim();
            if (rRoom !== targetRoom) return false;

            const rDate = parseFlexibleDate(r[col.BookingDate]);
            if (!rDate || formatDateISO(rDate) !== targetISO) return false;

            const rStart = toMinutes(formatTimeFromSheet(r[col.StartTime]));
            const rEnd = toMinutes(formatTimeFromSheet(r[col.EndTime]));
            
            return (targetStart < rEnd && rStart < targetEnd);
         });

         if (collision && !isOverride) {
            return fail_(`รายการวันที่ ${formatThaiDateFullHelper(targetDate)} ชนกับรายการที่อนุมัติแล้ว! ต้องใช้วิธี Override`);
         }
      }
    }
    // ------------------------------------------

    // อัปเดตทุกแถวในกลุ่ม
    foundRows.forEach(item => {
      sh.getRange(item.rowIndex, col.Status + 1).setValue('อนุมัติ');
      sh.getRange(item.rowIndex, col.ApprovedBy + 1).setValue(actor);

      if (isOverride) {
         const oldRemark = String(item.rowData.Remark || '');
         const overrideTag = `[Override by ${actor}]`;
         if (!oldRemark.includes(overrideTag)) {
            sh.getRange(item.rowIndex, col.Remark + 1).setValue(oldRemark ? `${oldRemark} ${overrideTag}` : overrideTag);
         }
      }

      if (col.UpdatedAt != null) sh.getRange(item.rowIndex, col.UpdatedAt + 1).setValue(new Date());
    });

    SpreadsheetApp.flush();

    // Notification Logic (ส่งข้อความรวม 1 ใบ)
    const primaryBooking = foundRows[0].rowData;
    const rowObj = { ...primaryBooking, Status: 'อนุมัติ', ApprovedBy: actor };
    try { sendTelegramNotification(rowObj, 'Approve', false); } catch (e) {}

    return ok_({ message: isOverride ? 'อนุมัติแบบ Override เรียบร้อย' : 'อนุมัติเรียบร้อยแล้ว' });

  } catch (e) {
    Logger.log('approveBooking error: ' + e);
    return fail_('อนุมัติไม่สำเร็จ: ' + e.message);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}


function rejectBooking(payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    const data = (payload && typeof payload === 'object') ? payload : {};
    const bookingId = String(data.bookingId || data.BookingID || '').trim();
    const actorInput = String(data.actor || data.ApprovedBy || '').trim();
    const remark = String(data.remark || data.Remark || data.reason || '').trim();

    if (!bookingId) return fail_('กรุณาระบุ bookingId');
    if (!remark) return fail_('กรุณาระบุเหตุผลไม่อนุมัติ');

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sh = ss.getSheetByName(SHEET_NAMES.BOOKINGS || 'Bookings');
    if (!sh) return fail_('ไม่พบชีต Bookings');

    const values = sh.getDataRange().getValues();
    if (!values || values.length < 2) return fail_('ไม่พบข้อมูลการจอง');

    const headers = values[0].map(h => String(h || '').trim());
    const col = {};
    headers.forEach((h, i) => { if (h) col[h] = i; });

    const mustHave = ['BookingID', 'Status', 'ApprovedBy', 'Remark'];
    const missing = mustHave.filter(h => col[h] == null);
    if (missing.length) return fail_('โครงสร้างชีต Bookings ไม่ครบคอลัมน์: ' + missing.join(', '));

    const userProps = PropertiesService.getUserProperties();
    const actor = actorInput || userProps.getProperty('session_displayname') || 'Admin';

    let foundRows = [];
    for (let r = 1; r < values.length; r++) {
      if (String(values[r][col.BookingID] || '').trim() === bookingId) {
        let targetBooking = {};
        headers.forEach((h, i) => targetBooking[h] = values[r][i]);
        foundRows.push({ rowIndex: r + 1, rowData: targetBooking });
      }
    }
    if (foundRows.length === 0) return fail_('ไม่พบรายการจองนี้');

    const firstStatus = String(foundRows[0].rowData.Status || '').trim();
    const notAllowed = new Set(['ไม่อนุมัติ', 'ยกเลิก']);
    if (notAllowed.has(firstStatus)) {
      return fail_('รายการนี้ถูกอัปเดตแล้ว (สถานะปัจจุบัน: ' + firstStatus + ')');
    }

    foundRows.forEach(item => {
      sh.getRange(item.rowIndex, col.Status + 1).setValue('ไม่อนุมัติ');
      sh.getRange(item.rowIndex, col.ApprovedBy + 1).setValue(actor);
      sh.getRange(item.rowIndex, col.Remark + 1).setValue(remark);

      if (col.UpdatedAt != null) {
        sh.getRange(item.rowIndex, col.UpdatedAt + 1).setValue(new Date());
      }
    });

    SpreadsheetApp.flush();

    const primaryBooking = foundRows[0].rowData;
    const rowObj = { ...primaryBooking, Status: 'ไม่อนุมัติ', ApprovedBy: actor, Remark: remark };

    try {
      sendTelegramNotification(rowObj, 'Reject', false);
    } catch (e) {
      Logger.log('Telegram Error(rejectBooking): ' + (e && e.message ? e.message : e));
    }

    foundRows.forEach(item => {
      try {
        if (typeof updateStatistics === 'function') {
          const roomId = String(item.rowData.RoomID || '').trim();
          const bDate = item.rowData.BookingDate;
          updateStatistics(roomId, bDate, 'cancel');
        }
      } catch (e) {
        Logger.log('updateStatistics(rejectBooking) error: ' + (e && e.message ? e.message : e));
      }
    });

    return ok_({ message: 'บันทึกผลการไม่อนุมัติเรียบร้อย' });

  } catch (e) {
    Logger.log('rejectBooking error: ' + e);
    return fail_('เกิดข้อผิดพลาด: ' + (e && e.message ? e.message : e));
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}



function handleAdminBookingAction(bookingId, action, reason) {
  const id = String(bookingId || '').trim();
  const act = String(action || '').trim();

  if (!id) return fail_('ไม่พบ BookingID');
  if (!act) return fail_('ไม่พบ action');

  try {
    if (act === 'Approve') {
      return approveBooking({ bookingId: id });
    }

    if (act === 'Reject') {
      const remark = String(reason || '').trim();
      return rejectBooking({ bookingId: id, remark: remark });
    }

    return fail_('action ไม่ถูกต้อง: ' + act);

  } catch (e) {
    Logger.log('handleAdminBookingAction error: ' + (e && e.message ? e.message : e));
    return fail_('ดำเนินการไม่สำเร็จ');
  }
}

function processBookingAction(payload) {
  try {
    const data = (payload && typeof payload === 'object') ? payload : {};
    const bookingId = String(data.bookingId || data.BookingID || '').trim();
    const action = String(data.action || '').trim().toLowerCase();
    const remark = String(data.remark || data.reason || '').trim();

    const role = String(data.role || '').trim().toLowerCase();
    const actor = String(data.actor || data.approvedBy || data.username || '').trim() || 'system';

    // ✅ NEW: test controls (optional)
    const isDryRun = data.isDryRun === true;
    const skipTelegram = data.skipTelegram === true;

    if (!bookingId) return fail_('ไม่พบ BookingID');
    if (!action) return fail_('ไม่พบ action');

    if (action === 'approve') {
      // ✅ pass-through dry-run options (approveBooking must ignore if not supported)
      return approveBooking({ bookingId: bookingId, actor: actor, isDryRun: isDryRun, skipTelegram: skipTelegram });
    }

    if (action === 'override') {
      return approveBooking({ bookingId: bookingId, actor: actor, isOverride: true, isDryRun: isDryRun, skipTelegram: skipTelegram });
    }

    if (action === 'reject') {
      return rejectBooking({ bookingId: bookingId, remark: remark, actor: actor, isDryRun: isDryRun, skipTelegram: skipTelegram });
    }

    if (action === 'cancel') {
      const phoneNumber = String(data.phoneNumber || '').trim();

      return cancelBookingUnified({
        bookingId: bookingId,
        phoneNumber: phoneNumber,
        reason: remark,
        role: role,
        actor: actor,
        isDryRun: isDryRun,
        skipTelegram: skipTelegram
      });
    }

    return fail_('action ไม่ถูกต้อง: ' + action);

  } catch (e) {
    Logger.log('processBookingAction error: ' + (e && e.message ? e.message : e));
    return fail_('ดำเนินการไม่สำเร็จ');
  }
}




function listCancelableBookingsByPhone(payload) {
  try {
    const phoneInput = payload && payload.phoneNumber != null ? String(payload.phoneNumber) : '';
    const phone = normalizePhone(phoneInput);

    if (!phone) return ok_({ items: [] });

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sh = ss.getSheetByName(SHEET_NAMES.BOOKINGS);
    if (!sh) return ok_({ items: [] });

    const rows = sheetToObjects(sh);

    const isCancelableStatus = (statusValue) => {
      const s = String(statusValue || '').trim().toLowerCase();

      if (!s) return true;

      const notAllowed = new Set([
        'cancel', 'cancelled', 'canceled', 'ยกเลิก',
        'reject', 'rejected', 'ไม่อนุมัติ'
      ]);
      if (notAllowed.has(s)) return false;

      const allowed = new Set([
        'pending', 'รออนุมัติ',
        'approve', 'approved', 'อนุมัติ'
      ]);
      if (allowed.has(s)) return true;

      return true;
    };

    const toSortKey = (b) => {
      const d = parseFlexibleDate(b.BookingDate) || parseFlexibleDate(b.Timestamp) || null;
      const base = d && !isNaN(d.getTime()) ? d.getTime() : 0;

      const t = String(b.StartTime || '').trim();
      const m = t.match(/^(\d{1,2})[:.](\d{2})$/);
      let add = 0;
      if (m) add = (Number(m[1]) * 60 + Number(m[2])) * 60000;

      return base + add;
    };

    const items = rows
      .filter(b => normalizePhone(b.PhoneNumber) === phone)
      .filter(b => isCancelableStatus(b.Status))
      .map(b => {
        const d = parseFlexibleDate(b.BookingDate);
        const dateISO = d && !isNaN(d.getTime()) ? formatDateISO(d) : '';
        return {
          bookingId: String(b.BookingID || '').trim(),
          roomId: String(b.RoomID || '').trim(),
          purpose: String(b.Purpose || '').trim(),
          dateISO: dateISO,
          start: formatTimeFromSheet(b.StartTime),
          end: formatTimeFromSheet(b.EndTime),
          status: String(b.Status || '').trim()
        };
      })
      .filter(x => x.bookingId)
      .sort((a, b) => toSortKey(b) - toSortKey(a))
      .slice(0, 8);

    return ok_({ items: items });

  } catch (e) {
    Logger.log('listCancelableBookingsByPhone error: ' + e);
    return ok_({ items: [] });
  }
}


function incrementStatistics_(payload) {
  try {
    const roomId = payload && payload.roomId;
    const date = payload && payload.date;
    const override = payload && payload.override === true;

    if (!roomId || !date) return ok_(false);

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sh = ss.getSheetByName(SHEET_NAMES.STATISTICS) || ss.insertSheet(SHEET_NAMES.STATISTICS);

    if (sh.getLastRow() === 0) {
      sh.appendRow(['Date', 'RoomID', 'BookingCount', 'OverrideCount']);
    }

    const data = sh.getDataRange().getValues();
    const header = data[0];

    const dateCol = header.indexOf('Date');
    const roomCol = header.indexOf('RoomID');
    const bookCol = header.indexOf('BookingCount');
    let overCol = header.indexOf('OverrideCount');

    if (overCol === -1) {
      sh.getRange(1, header.length + 1).setValue('OverrideCount');
      overCol = header.length;
    }

    for (let r = 1; r < data.length; r++) {
      if (String(data[r][dateCol]) === String(date) && String(data[r][roomCol]) === String(roomId)) {
        const curB = parseInt(data[r][bookCol] || 0, 10) || 0;
        const curO = parseInt(data[r][overCol] || 0, 10) || 0;
        data[r][bookCol] = curB + 1;
        data[r][overCol] = override ? (curO + 1) : curO;
        sh.getRange(r + 1, 1, 1, Math.max(header.length, overCol + 1)).setValues([data[r]]);
        return ok_(true);
      }
    }

    sh.appendRow([date, roomId, 1, override ? 1 : 0]);
    return ok_(true);

  } catch (e) {
    Logger.log('incrementStatistics_ error: ' + e);
    return fail_('update statistics failed');
  }
}

function normalizeBookingStatus(status) {
  const s = String(status == null ? '' : status).trim().toLowerCase();

  if (!s) return 'รออนุมัติ';

  // english variants
  if (['pending', 'wait', 'requested'].includes(s)) return 'รออนุมัติ';
  if (['approved', 'approve', 'ok', 'confirm'].includes(s)) return 'อนุมัติ';
  if (['rejected', 'reject', 'deny', 'denied'].includes(s)) return 'ไม่อนุมัติ';
  if (['cancelled', 'canceled', 'cancel'].includes(s)) return 'ยกเลิกการจอง';

  // thai variants
  if (s.includes('รออนุมัติ')) return 'รออนุมัติ';
  if (s.includes('อนุมัติ') && !s.includes('ไม่')) return 'อนุมัติ';
  if (s.includes('ไม่อนุมัติ')) return 'ไม่อนุมัติ';
  if (s.includes('ยกเลิก')) return 'ยกเลิกการจอง';

  // fallback safe
  return 'รออนุมัติ';
}

function updateBookingStatus(bookingId, newStatus, actor, remark, options) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sheet = ss.getSheetByName(SHEET_NAMES.BOOKINGS || 'Bookings');
    if (!sheet) return fail_('ไม่พบชีต Bookings');

    const data = sheet.getDataRange().getDisplayValues();
    if (!data || data.length < 2) return fail_('ชีต Bookings ไม่มีข้อมูล');

    const headers = data[0].map(h => String(h || '').trim());

    const bookingIdCol = headers.indexOf('BookingID');
    const statusCol = headers.indexOf('Status');
    const approvedByCol = headers.indexOf('ApprovedBy');
    const remarkCol = headers.indexOf('Remark');
    const cancelAtCol = headers.indexOf('CancelAt');
    const cancelledByCol = headers.indexOf('CancelledBy');
    const phoneCol = headers.indexOf('PhoneNumber'); // keep string
    const tsCol = headers.indexOf('Timestamp');

    // ✅ guard columns (ขั้นต่ำที่ต้องมี)
    if (bookingIdCol < 0) return fail_('โครงสร้างชีต Bookings ไม่ครบ: BookingID');
    if (statusCol < 0) return fail_('โครงสร้างชีต Bookings ไม่ครบ: Status');
    if (approvedByCol < 0) return fail_('โครงสร้างชีต Bookings ไม่ครบ: ApprovedBy');
    if (remarkCol < 0) return fail_('โครงสร้างชีต Bookings ไม่ครบ: Remark');

    const id = String(bookingId || '').trim();
    if (!id) return fail_('BookingID ว่าง');

    const finalStatus = normalizeBookingStatus(newStatus); // ✅ enforce STATUS CONTRACT
    const normalizedActor = String(actor || '').trim() || 'SYSTEM';
    const normalizedRemark = String(remark || '').trim();

    // ✅ options (ไม่กระทบของเดิม)
    const opt = (options && typeof options === 'object') ? options : {};
    const isDryRun = opt.isDryRun === true;       // สำหรับ test: telegram log-only
    const skipTelegram = opt.skipTelegram === true; // สำหรับ test: ไม่เรียก telegram เลย
    const now = new Date();

    for (let i = 1; i < data.length; i++) {
      const rowId = String(data[i][bookingIdCol] || '').trim();
      if (rowId !== id) continue;

      // ✅ สร้าง bookingData จาก header เพื่อใช้ส่ง notifier/สถิติ
      const bookingData = {};
      headers.forEach((h, j) => bookingData[h] = data[i][j]);

      // ✅ เขียนค่าลงชีตจริง (map ตาม header)
      sheet.getRange(i + 1, statusCol + 1).setValue(finalStatus);
      sheet.getRange(i + 1, approvedByCol + 1).setValue(normalizedActor);

      // ถ้า remark ที่ส่งมาเป็นค่าว่าง ให้คง remark เดิมไว้
      const prevRemark = String(bookingData.Remark || '').trim();
      const finalRemark = normalizedRemark || prevRemark;
      sheet.getRange(i + 1, remarkCol + 1).setValue(finalRemark);

      // ✅ keep phone as string (กัน 0 หาย)
      if (phoneCol >= 0) {
        const phone = String(bookingData.PhoneNumber || '').trim();
        if (phone) sheet.getRange(i + 1, phoneCol + 1).setNumberFormat('@').setValue(phone);
      }

      // ✅ optional timestamp touch (ถ้ามีคอลัมน์)
      if (tsCol >= 0) {
        const prevTs = String(bookingData.Timestamp || '').trim();
        if (!prevTs) sheet.getRange(i + 1, tsCol + 1).setValue(now);
      }

      // ✅ update bookingData ให้ตรงกับค่าที่เขียน
      bookingData.Status = finalStatus;
      bookingData.ApprovedBy = normalizedActor;
      bookingData.Remark = finalRemark;

      // ✅ cancel fields (เฉพาะตอนยกเลิกการจอง)
      if (finalStatus === 'ยกเลิกการจอง') {
        if (cancelAtCol >= 0) sheet.getRange(i + 1, cancelAtCol + 1).setValue(now);
        if (cancelledByCol >= 0) sheet.getRange(i + 1, cancelledByCol + 1).setValue(normalizedActor);
        bookingData.CancelAt = now;
        bookingData.CancelledBy = normalizedActor;
      }

      SpreadsheetApp.flush(); // ✅ สำคัญ: ให้เขียนเสร็จก่อนค่อย notify/log

      // ✅ update statistics (คงพฤติกรรมเดิม แต่ normalize แล้ว)
      try {
        if (finalStatus === 'ยกเลิกการจอง' || finalStatus === 'ไม่อนุมัติ') {
          updateStatistics(bookingData.RoomID, bookingData.BookingDate, 'cancel');
        }
      } catch (statsErr) {
        Logger.log('updateStatistics error: ' + statsErr);
      }

      // ✅ map statusType เดิมไปใช้กับ notifier (แต่สถานะในชีตจะเป็นไทย 4 ค่าเสมอ)
      const statusTypeMap = {
        'รออนุมัติ': 'pending',
        'อนุมัติ': 'approved',
        'ไม่อนุมัติ': 'rejected',
        'ยกเลิกการจอง': 'cancelled'
      };
      const statusType = statusTypeMap[finalStatus] || 'updated';

      // ✅ Telegram notify (production: เดิมส่งจริง / test: dry-run หรือ skip)
      if (!skipTelegram) {
        try {
          sendTelegramNotification(bookingData, statusType, isDryRun);
        } catch (tgErr) {
          Logger.log('sendTelegramNotification error: ' + tgErr);
        }
      } else {
        Logger.log(`[TEST] skipTelegram=true | bookingId=${id} | status=${finalStatus}`);
      }

      return ok_({
        message: `อัปเดตสถานะเป็น "${finalStatus}" เรียบร้อย`,
        bookingId: id,
        status: finalStatus
      });
    }

    return fail_('ไม่พบการจองที่ระบุ');
  } catch (e) {
    Logger.log('updateBookingStatus error: ' + e);
    return fail_('updateBookingStatus ล้มเหลว: ' + (e && e.message ? e.message : e));
  }
}




function updateBookingRemark(payload) {
  try {
    const { bookingId, remark } = payload || {};
    if (!bookingId) {
      return fail_('bookingId ไม่ถูกต้อง');
    }

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sh = ss.getSheetByName(SHEET_NAMES.BOOKINGS);
    if (!sh) {
      return fail_('ไม่พบชีต Bookings');
    }

    const values = sh.getDataRange().getValues();
    const headers = values[0];
    const idxBookingId = headers.indexOf('BookingID');
    const idxRemark    = headers.indexOf('Remark');
    const idxUpdatedAt = headers.indexOf('UpdatedAt'); // optional (เพิ่มเอง)

    if (idxBookingId === -1 || idxRemark === -1) {
      return fail_('ไม่พบคอลัมน์ BookingID หรือ Remark');
    }

    let updatedRow = null;
    for (let r = 1; r < values.length; r++) {
      if (String(values[r][idxBookingId]) === String(bookingId)) {
        // update remark
        sh.getRange(r + 1, idxRemark + 1).setValue(String(remark || ''));
        if (idxUpdatedAt !== -1) {
          sh.getRange(r + 1, idxUpdatedAt + 1).setValue(new Date());
        }
        updatedRow = r + 1;
        break;
      }
    }

    if (!updatedRow) {
      return fail_(`ไม่พบ BookingID ${bookingId}`);
    }

    return ok_({ bookingId, remark });
  } catch (err) {
    Logger.log('updateBookingRemark error: ' + err);
    return fail_('ไม่สามารถอัปเดตหมายเหตุได้');
  }
}

// ====== NOTIFICATION & HELPERS ======
function isUrlText(v) {
  const s = String(v || '').trim();
  return /^https?:\/\//i.test(s);
}

function isDriveIdText(v) {
  const s = String(v || '').trim();
  return /^[a-zA-Z0-9_-]{15,}$/.test(s);
}

function driveDownloadUrlFromId(fileId) {
  const id = String(fileId || '').trim();
  if (!id) return '';
  return 'https://drive.google.com/uc?export=download&id=' + encodeURIComponent(id);
}

function normalizeBookingKey(v) {
  return String(v == null ? '' : v)
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
    .replace(/[‐-‒–—﹘﹣−]/g, '-')
    .replace(/\s+/g, '')
    .trim()
    .toUpperCase();
}

function normalizeUploadRow(fileId, fileName, fileUrl) {
  const id = String(fileId || '').trim();
  const name = String(fileName || '').trim();
  const url = String(fileUrl || '').trim();

  if (isUrlText(url)) return { name: name, url: url };

  if (isDriveIdText(id)) {
    return { name: name || url || ('ไฟล์แนบ ' + id.slice(0, 8)), url: driveDownloadUrlFromId(id) };
  }

  if (isDriveIdText(url)) {
    return { name: name || ('ไฟล์แนบ ' + url.slice(0, 8)), url: driveDownloadUrlFromId(url) };
  }

  if (isDriveIdText(name)) {
    return { name: url || ('ไฟล์แนบ ' + name.slice(0, 8)), url: driveDownloadUrlFromId(name) };
  }

  return { name: name, url: '' };
}

function dedupLinks(items) {
  const seen = new Set();
  const out = [];
  (items || []).forEach(it => {
    if (!it) return;
    const u = String(it.url || '').trim();
    if (!u || seen.has(u)) return;
    seen.add(u);
    out.push({ name: String(it.name || '').trim(), url: u });
  });
  return out;
}

function parseUploadedFiles(raw) {
  const s = String(raw || '').trim();
  if (!s) return [];

  const items = s.includes('||') ? s.split('||') : s.split(' | ');
  const out = [];

  items.map(x => String(x || '').trim()).filter(Boolean).forEach(part => {
    if (part.includes('|')) {
      const seg = part.split('|').map(t => String(t || '').trim()).filter(Boolean);
      if (seg.length >= 2) {
        const name = seg[0];
        const url = seg.slice(1).join('|');
        if (isUrlText(url)) out.push({ name: name || guessFileNameFromUrl(url), url: url });
        return;
      }
    }

    if (isUrlText(part)) {
      out.push({ name: guessFileNameFromUrl(part), url: part });
      return;
    }

    const comma = part.split(',').map(t => String(t || '').trim()).filter(Boolean);
    if (comma.length >= 2 && isUrlText(comma[1])) {
      out.push({ name: comma[0] || guessFileNameFromUrl(comma[1]), url: comma[1] });
      return;
    }
  });

  return dedupLinks(out);
}

function guessFileNameFromUrl(url) {
  const u = String(url || '').trim();
  if (!u) return 'ไฟล์แนบ';
  const m = u.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m && m[1]) return 'ไฟล์แนบ ' + m[1].slice(0, 8);
  const tail = u.split('?')[0].split('#')[0].split('/').pop();
  return tail ? tail : 'ไฟล์แนบ';
}

var cachedSs = null;

function getSsHelper() {
  if (cachedSs) return cachedSs;
  cachedSs = SpreadsheetApp.openById(SHEET_ID);
  return cachedSs;
}

function getTelegramFileLinks(bookingId) {
  try {
    var rawId = String(bookingId || '').trim();
    if (!rawId) return [];

    var idKey = normalizeBookingKey(rawId);
    var ss = getSsHelper();
    var norm = function (v) { return String(v == null ? '' : v).trim(); };

    var findHeaderIndex = function (headers, candidates) {
      var h = headers.map(function (x) { return norm(x); });
      for (var i = 0; i < candidates.length; i++) {
        var idx = h.indexOf(candidates[i]);
        if (idx >= 0) return idx;
      }
      return -1;
    };

    var bookingsName = (SHEET_NAMES && SHEET_NAMES.BOOKINGS) ? SHEET_NAMES.BOOKINGS : 'Bookings';
    var bookingsSh = ss.getSheetByName(bookingsName);

    if (bookingsSh) {
      var v = bookingsSh.getDataRange().getValues();
      if (v && v.length >= 2) {
        var headers = v[0].map(norm);
        var idCol = findHeaderIndex(headers, ['BookingID', 'Booking Id', 'BookingId']);
        var uploadedCol = findHeaderIndex(headers, ['UploadedFiles', 'Uploaded Files', 'FileLinks', 'File Links']);
        if (idCol >= 0 && uploadedCol >= 0) {
          for (var r = 1; r < v.length; r++) {
            if (normalizeBookingKey(v[r][idCol]) === idKey) {
              var raw = norm(v[r][uploadedCol]);
              var parsed = parseUploadedFiles(raw);
              if (parsed.length) return dedupLinks(parsed);
              break;
            }
          }
        }
      }
    }

    var uploadsName = (SHEET_NAMES && SHEET_NAMES.UPLOADS) ? SHEET_NAMES.UPLOADS : 'Uploads';
    var uploadsSh = ss.getSheetByName(uploadsName);
    if (!uploadsSh) return [];

    var uv = uploadsSh.getDataRange().getValues();
    if (!uv || uv.length < 2) return [];

    var header = uv[0].map(norm);
    var upIdCol = findHeaderIndex(header, ['BookingID', 'Booking Id', 'BookingId']);
    var fileIdCol = findHeaderIndex(header, ['FileID', 'File Id', 'FileId', 'DriveFileId', 'DriveFileID']);
    var fileNameCol = findHeaderIndex(header, ['FileName', 'File Name', 'Filename', 'Name']);
    var fileUrlCol = findHeaderIndex(header, ['FileURL', 'FileUrl', 'File URL', 'URL', 'Link', 'FileLink']);
    if (upIdCol < 0) return [];

    var collectFromRow = function (row) {
      var rawFileId = fileIdCol >= 0 ? norm(row[fileIdCol]) : '';
      var rawFileName = fileNameCol >= 0 ? norm(row[fileNameCol]) : '';
      var rawFileUrl = fileUrlCol >= 0 ? norm(row[fileUrlCol]) : '';

      var fixed = normalizeUploadRow(rawFileId, rawFileName, rawFileUrl);
      var url = fixed && fixed.url ? String(fixed.url).trim() : '';
      if (!url) return null;

      var name = fixed && fixed.name ? String(fixed.name).trim() : '';
      if (!name) name = guessFileNameFromUrl(url) || 'ไฟล์แนบ';

      return { name: name, url: url };
    };

    var out = [];

    for (var r1 = 1; r1 < uv.length; r1++) {
      var upIdKey = normalizeBookingKey(uv[r1][upIdCol]);
      if (upIdKey === idKey) {
        var item = collectFromRow(uv[r1]);
        if (item) out.push(item);
      }
    }
    if (out.length) return dedupLinks(out);

    for (var r2 = 1; r2 < uv.length; r2++) {
      var upId = norm(uv[r2][upIdCol]);
      if (upId && normalizeBookingKey(upId).indexOf(idKey) === 0) {
        var item2 = collectFromRow(uv[r2]);
        if (item2) out.push(item2);
      }
    }

    return dedupLinks(out);

  } catch (e) {
    Logger.log('getTelegramFileLinks error: ' + e);
    return [];
  }
}

function waitForTelegramFileLinks(bookingId, maxAttempts, sleepMs) {
  var tries = Math.max(1, Number(maxAttempts || 3));
  var wait = Math.max(200, Number(sleepMs || 800));

  for (var i = 1; i <= tries; i++) {
    var links = getTelegramFileLinks(bookingId);
    if (links && links.length) return links;

    if (i < tries) Utilities.sleep(wait);
  }
  return [];
}

function formatTelegramAttachmentBlock(bookingRow, bookingId) {
  try {
    const roomMap = getRoomMapHelper();

    const htmlEscape = (v) => {
      const s = String(v == null ? '' : v);
      return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    const roomId = String((bookingRow && (bookingRow.RoomID || bookingRow.roomId)) || '').trim();
    const roomName = roomMap[roomId] || roomId || '-';

    const dateText = formatThaiDateFullHelper((bookingRow && (bookingRow.BookingDate || bookingRow.bookingDate)) || '');

    const links = waitForTelegramFileLinks(bookingId, 5, 800) || [];
    if (!links.length) return '';

    let out = '';
    out += '\n\n📎 <b>อัปโหลดไฟล์แนบแล้ว</b> (' + links.length + ' ไฟล์)\n';
    out += '🏫 ' + htmlEscape(roomName) + ' • ' + htmlEscape(dateText) + '\n';
    out += '🔎 ' + htmlEscape(bookingId) + '\n\n';

    for (let i = 0; i < links.length; i++) {
      const item = links[i] || {};
      const name = String(item.name || 'ไฟล์แนบ').trim();
      const url = String(item.url || '').trim();
      if (!url) continue;

      out += (i + 1) + ') ' + htmlEscape(name) + ' (<a href="' + htmlEscape(url) + '">เปิดลิงก์</a>)\n';
    }

    return out.trim();
  } catch (e) {
    Logger.log('formatTelegramAttachmentBlock error: ' + e);
    return '';
  }
}

// [ANCHOR:SERVER.sendTelegramNotification:REPLACE]
function sendTelegramNotification(data, statusType, isDryRun = false) {
  try {
    const roomMap = getRoomMapHelper();

    // Helper: Escape HTML Characters
    const e = (v) => {
      const s = String(v == null ? '' : v);
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };

    // Helper: Pick Data
    const pick = (obj, keys) => {
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        const val = obj && obj[k];
        if (val !== undefined && val !== null && String(val).trim() !== '') return val;
      }
      return null;
    };

    // 1. Prepare Data
    const base0 = (data && data.bookingRow && typeof data.bookingRow === 'object') ? data.bookingRow : data;
    const bookingId = String(pick(base0, ['BookingID', 'bookingId', 'id']) || '').trim();

    // ถ้ามี ID ให้ลองดึงข้อมูลล่าสุดจาก Sheet (เผื่อข้อมูลที่ส่งมาไม่ครบ)
    let base = base0;
    if (bookingId) {
       // ฟังก์ชัน readBookingRowById ต้องมีอยู่จริงใน code.gs (ถ้าไม่มีให้ใช้ base0)
       // ในที่นี้สมมติว่าใช้ base0 ไปก่อน ถ้าเจ้านายมีฟังก์ชันอ่านก็เปิดใช้ได้ค่ะ
       const fromSheet = typeof readBookingRowById === 'function' ? readBookingRowById(bookingId) : null;
       if (fromSheet) base = fromSheet;
    }

    // Extract Fields
    const status = String(pick(base, ['Status']) || '').trim();
    const cancelledBy = String(pick(base, ['CancelledBy']) || '').trim();
    
    // Determine Type
    let st = String(statusType || '').toLowerCase();
    if (st === 'upload' || statusType === 'Upload') st = 'upload';
    else if (status === 'ยกเลิก') st = cancelledBy ? 'cancelAdmin' : 'cancelBooker';
    else if (status === 'อนุมัติ') st = 'approved';
    else if (status === 'ไม่อนุมัติ') st = 'rejected';
    else if (!st || st === 'new') st = 'pending';

    // Data Variables
    const roomId = String(pick(base, ['RoomID']) || '').trim();
    const roomName = roomMap[roomId] || roomId || '-';

    let dateText = '';
    let matchedDates = [];
    if (data && Array.isArray(data.BookingDates)) {
      matchedDates = data.BookingDates;
    } else if (bookingId) {
      try {
        const ss = SpreadsheetApp.openById(SHEET_ID);
        const bookingsSh = ss.getSheetByName(SHEET_NAMES.BOOKINGS || 'Bookings');
        if (bookingsSh) {
          const allVals = bookingsSh.getDataRange().getValues();
          const hdrs = allVals[0].map(h => String(h || '').trim());
          const idIdx = hdrs.indexOf('BookingID');
          const dateIdx = hdrs.indexOf('BookingDate');
          if (idIdx >= 0 && dateIdx >= 0) {
            for (let r = 1; r < allVals.length; r++) {
              if (String(allVals[r][idIdx] || '').trim() === bookingId) {
                const dObj = parseFlexibleDate(allVals[r][dateIdx]);
                if (dObj && !isNaN(dObj.getTime())) {
                  matchedDates.push(dObj);
                }
              }
            }
          }
        }
      } catch (eDates) {
        Logger.log('Telegram dates extraction warning: ' + eDates);
      }
    }

    if (matchedDates.length > 0) {
      const uniqueTimestamps = Array.from(new Set(matchedDates.map(d => {
        const copy = new Date(d);
        copy.setHours(0, 0, 0, 0);
        return copy.getTime();
      })));
      uniqueTimestamps.sort();
      const uniqueDates = uniqueTimestamps.map(t => new Date(t));
      
      const formattedList = uniqueDates.map(d => formatThaiDateFullHelper(d));
      if (uniqueDates.length === 1) {
        dateText = formattedList[0];
      } else {
        let isConsecutive = true;
        for (let i = 1; i < uniqueDates.length; i++) {
          const diffTime = Math.abs(uniqueDates[i] - uniqueDates[i-1]);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays !== 1) {
            isConsecutive = false;
            break;
          }
        }
        
        if (isConsecutive) {
          dateText = `${formatThaiDateFullHelper(uniqueDates[0])} ถึง ${formatThaiDateFullHelper(uniqueDates[uniqueDates.length - 1])} (ต่อเนื่อง ${uniqueDates.length} วัน)`;
        } else {
          if (uniqueDates.length <= 5) {
            dateText = formattedList.join(', ') + ` (รวม ${uniqueDates.length} วัน)`;
          } else {
            dateText = `${formatThaiDateFullHelper(uniqueDates[0])} ถึง ${formatThaiDateFullHelper(uniqueDates[uniqueDates.length - 1])} (เลือกบางวัน, รวม ${uniqueDates.length} วัน)`;
          }
        }
      }
    } else {
      dateText = formatThaiDateFullHelper(pick(base, ['BookingDate']));
    }

    const startTime = formatTimeFromSheet(pick(base, ['StartTime']));
    const endTime = formatTimeFromSheet(pick(base, ['EndTime']));
    const bookerName = String(pick(base, ['BookerName']) || '-');
    const phone = normalizePhone(String(pick(base, ['PhoneNumber']) || ''));
    const attendees = String(pick(base, ['Attendees']) || '-');
    const purpose = String(pick(base, ['Purpose']) || '-');
    const equipment = String(pick(base, ['Equipment']) || '-');
    const software = String(pick(base, ['Software']) || '');
    const meetingLink = String(pick(base, ['MeetingLink']) || '');
    const remark = String(pick(base, ['Remark']) || '');

    let msg = '';

    // ==========================================
    // 📎 CASE 1: UPLOAD NOTIFICATION
    // ==========================================
    if (st === 'upload') {
        const fileLinks = getTelegramFileLinks(bookingId); // ต้องมีฟังก์ชันนี้ใน code.gs
        const fileCount = fileLinks.length;
        
        msg += `📎 <b>อัปโหลดไฟล์แนบแล้ว (${fileCount} ไฟล์)</b>\n`;
        msg += `🏫 ${e(roomName)} • ${e(dateText)}\n`;
        msg += `🔎 ${e(bookingId)}\n\n`;
        
        if (fileCount > 0) {
            fileLinks.forEach((f, i) => {
                msg += `${i + 1}) <a href="${f.url}">${e(f.name)}</a>\n`;
            });
        } else {
            msg += `(ไม่พบลิงก์ไฟล์)\n`;
        }
    } 
    // ==========================================
    // 📢 CASE 2: STANDARD NOTIFICATION
    // ==========================================
    else {
        if (['pending', 'approved', 'rejected'].includes(st)) {
            if (st === 'pending') msg += '⏳ แจ้งเตือนคำขอจองห้องเรียน (รายการใหม่)\n';
            else if (st === 'approved') msg += '✅ อนุมัติการจองห้องเรียนเรียบร้อยแล้ว\n';
            else msg += '❌ ไม่อนุมัติคำขอจองห้องเรียน\n';

            msg += '🆔 Booking ID: ' + e(bookingId) + '\n';
            msg += '──────────────\n';
            msg += '👤 ผู้จอง: ' + e(bookerName) + '\n';
            msg += '📞 โทร: ' + e(phone || '-') + '\n';
            msg += '🏫 ห้อง: ' + e(roomName) + '\n';
            msg += '🎯 วัตถุประสงค์: ' + e(purpose) + '\n';
            msg += '👥 ผู้เข้าร่วม: ' + e(attendees) + ' คน\n';
            msg += '📅 วันที่: ' + e(dateText) + '\n';
            msg += '⏰ เวลา: ' + e(startTime) + ' - ' + e(endTime) + ' น.\n';
            msg += '🖥️ อุปกรณ์: ' + e(equipment) + '\n';

            if (software) msg += '💻 ซอฟต์แวร์: ' + e(software) + '\n';
            if (meetingLink) msg += '🔗 Meeting Link: <a href="' + e(meetingLink) + '">เปิดลิงก์</a>\n';
            if (st === 'rejected') msg += '📝 เหตุผล: ' + e(remark || '-') + '\n';
            else if (remark) msg += '📝 หมายเหตุ: ' + e(remark) + '\n';

            msg += '──────────────\n';
            msg += '🔖 สถานะ\n';
            if (st === 'pending') msg += '⏳ รออนุมัติ';
            else if (st === 'approved') msg += '✅ อนุมัติ';
            else msg += '❌ ไม่อนุมัติ';
        } else {
        // 1. Header
        if (st === 'cancelBooker') msg += '📢 <b>ผู้จองยกเลิกการจองเอง</b>\n\n';
        else if (st === 'cancelAdmin') msg += '📢 <b>ผู้ดูแลยกเลิกการจองแทน</b>\n\n';
        else msg += '📢 <b>อัปเดตสถานะการจอง</b>\n\n';

        // 2. User Info
        msg += `👤 <b>ข้อมูลผู้จอง</b>\n`;
        msg += `• ชื่อ-สกุล: ${e(bookerName)}\n`;
        msg += `• เบอร์โทร: ${phone || '-'}\n\n`;

        // 3. Booking Details
        msg += `🗓️ <b>รายละเอียดการจอง</b>\n`;
        msg += `• ห้อง: ${e(roomName)}\n`;
        msg += `• ผู้เข้าร่วม: ${e(attendees)} คน\n`;
        msg += `• วันที่: ${e(dateText)}\n`;
        msg += `• เวลา: ${e(startTime)} - ${e(endTime)}\n`;
        msg += `• วัตถุประสงค์: ${e(purpose)}\n`;
        msg += `• อุปกรณ์: ${e(equipment)}\n`;

        // 4. Software & Link (Optional)
        if (software) msg += `💻 ซอฟต์แวร์: ${e(software)}\n`;
        if (meetingLink) msg += `🔗 Meeting Link: <a href="${e(meetingLink)}">เปิดลิงก์</a>\n`;

        // 5. Remark (Optional)
        if (remark) {
            msg += `\n📝 <b>หมายเหตุ</b>\n`;
            msg += `${e(remark)}\n`;
        }

        // 6. Footer (ID)
        msg += `\n🔎 BookingID: ${e(bookingId)}`;
    }

        }

    // Send Logic
    if (isDryRun) {
      Logger.log('--------------------------------------------------');
      Logger.log('🧪 [DRY RUN TELEGRAM MESSAGE]');
      Logger.log(msg);
      Logger.log('--------------------------------------------------');
      return { ok: true, dryRun: true, message: msg };
    }

    return sendTelegramMsgHelper(msg, false);

  } catch (e) {
    Logger.log('sendTelegramNotification error: ' + e);
    return { ok: false, error: 'ส่งแจ้งเตือน Telegram ไม่สำเร็จ' };
  }
}
// [ANCHOR:SERVER.sendTelegramNotification:END]









function formatDateThaiFull(date) {
  if (!date || isNaN(date.getTime())) return '-';
  const months = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const d = date.getDate();
  const m = months[date.getMonth()];
  const y = date.getFullYear() + 543; // แปลงเป็น พ.ศ.
  return `${d} ${m} ${y}`;
}


function tgDivider() {
  return '──────────';
}

function tgSection(title) {
  return `${tgDivider()}\n${title}\n${tgDivider()}`;
}

function tgCardTitle(title) {
  return `┌ ${title}\n└ ${tgDivider()}`;
}

function tgLine(text) {
  return `• ${text}`;
}

function tgBlank() {
  return '';
}

function formatThaiDateBE(dateObj) {
  const tz = 'Asia/Bangkok';
  const d = new Date(dateObj);
  const y = d.getFullYear() + 543;
  const dm = Utilities.formatDate(d, tz, 'dd/MM');
  return `${dm}/${y}`;
}

function dayNameThai(dateObj) {
  const names = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  return names[new Date(dateObj).getDay()] || '';
}

function toMinutes(timeText) {
  const s = String(timeText || '').trim();
  const m = s.match(/^(\d{1,2})[:.](\d{2})/);
  if (!m) return null;
  return (parseInt(m[1], 10) * 60) + parseInt(m[2], 10);
}

function isOverlapTime(start1, end1, start2, end2) {
  const a1 = toMinutes(start1), b1 = toMinutes(end1), a2 = toMinutes(start2), b2 = toMinutes(end2);
  if (a1 === null || b1 === null || a2 === null || b2 === null) return false;
  return a1 < b2 && a2 < b1;
}

function normalizeDayKeywords(dateObj) {
  const idx = new Date(dateObj).getDay();
  const map = [
    ['อาทิตย์', 'sun', 'sunday', 'อา', 'อา.'],
    ['จันทร์', 'mon', 'monday', 'จ', 'จ.'],
    ['อังคาร', 'tue', 'tuesday', 'อ', 'อ.'],
    ['พุธ', 'wed', 'wednesday', 'พ', 'พ.'],
    ['พฤหัสบดี', 'thu', 'thursday', 'พฤ', 'พฤ.'],
    ['ศุกร์', 'fri', 'friday', 'ศ', 'ศ.'],
    ['เสาร์', 'sat', 'saturday', 'ส', 'ส.']
  ];
  return (map[idx] || []).map(x => String(x).toLowerCase());
}

function roomLabel(roomMap, roomId) {
  const info = roomMap[String(roomId)] || {};
  const name = String(info.RoomName || roomId);
  const cap = String(info.Capacity || '').trim();
  const loc = String(info.Location || '').trim();
  const parts = [];
  parts.push(`🚪 ${name}`);
  if (cap) parts.push(`(${cap} ที่นั่ง)`);
  if (loc) parts.push(`📍${loc}`);
  return parts.join(' ');
}

function buildDailyRoomSummaryMessage(dateISO) {
  const tz = 'Asia/Bangkok';
  const dObj = parseFlexibleDate(dateISO) || new Date();
  dObj.setHours(0, 0, 0, 0);
  const targetISO = formatDateISO(dObj);

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const shRooms = ss.getSheetByName(SHEET_NAMES.ROOMS || 'Rooms');
  const shClass = ss.getSheetByName(SHEET_NAMES.CLASS_SCHEDULE || 'ClassSchedule');
  const shBookings = ss.getSheetByName(SHEET_NAMES.BOOKINGS || 'Bookings');

  const rooms = shRooms ? sheetToObjects(shRooms) : [];
  const roomMap = {};
  rooms.forEach(r => {
    const id = String(r.RoomID || '').trim();
    if (id) roomMap[id] = r;
  });

  const dayKeywords = normalizeDayKeywords(dObj);

  const classSlotsByRoom = {};
  if (shClass && shClass.getLastRow() >= 2) {
    const values = shClass.getDataRange().getDisplayValues();
    const header = values[0].map(h => String(h || '').trim());

    const idxRoom = header.indexOf('RoomID');
    const idxDay = header.indexOf('Day');
    const idxSt = header.indexOf('StartTime');
    const idxEn = header.indexOf('EndTime');
    const idxFrom = header.indexOf('ValidFrom');
    const idxTo = header.indexOf('ValidTo');

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const roomId = String(row[idxRoom] || '').trim();
      if (!roomId) continue;

      const dayStr = String(row[idxDay] || '').toLowerCase();
      if (!dayKeywords.some(k => dayStr.includes(k))) continue;

      const vf = idxFrom >= 0 ? parseFlexibleDate(row[idxFrom]) : null;
      const vt = idxTo >= 0 ? parseFlexibleDate(row[idxTo]) : null;
      if (vf) vf.setHours(0, 0, 0, 0);
      if (vt) vt.setHours(0, 0, 0, 0);
      if (vf && dObj.getTime() < vf.getTime()) continue;
      if (vt && dObj.getTime() > vt.getTime()) continue;

      const st = formatTimeFromSheet(row[idxSt]);
      const en = formatTimeFromSheet(row[idxEn]);

      if (!classSlotsByRoom[roomId]) classSlotsByRoom[roomId] = [];
      classSlotsByRoom[roomId].push({ start: st, end: en });
    }
  }

  const bookings = [];
  if (shBookings && shBookings.getLastRow() >= 2) {
    const values = shBookings.getDataRange().getDisplayValues();
    const header = values[0].map(h => String(h || '').trim());

    const idxRoom = header.indexOf('RoomID');
    const idxDate = header.indexOf('BookingDate');
    const idxSt = header.indexOf('StartTime');
    const idxEn = header.indexOf('EndTime');
    const idxName = header.indexOf('BookerName');
    const idxPhone = header.indexOf('PhoneNumber');
    const idxPurpose = header.indexOf('Purpose');
    const idxStatus = header.indexOf('Status');
    const idxCancelAt = header.indexOf('CancelAt');

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const roomId = String(row[idxRoom] || '').trim();
      if (!roomId) continue;

      const status = String(row[idxStatus] || '').trim();
      if (status === 'ยกเลิก' || status === 'ไม่อนุมัติ') continue;
      if (idxCancelAt >= 0 && String(row[idxCancelAt] || '').trim()) continue;

      const d = parseFlexibleDate(row[idxDate]);
      if (!d) continue;
      d.setHours(0, 0, 0, 0);
      if (formatDateISO(d) !== targetISO) continue;

      bookings.push({
        roomId,
        start: formatTimeFromSheet(row[idxSt]),
        end: formatTimeFromSheet(row[idxEn]),
        purpose: String(row[idxPurpose] || '').trim() || 'จองห้อง',
        booker: String(row[idxName] || '').trim(),
        phone: String(row[idxPhone] || '').trim()
      });
    }
  }

  const clashes = [];
  bookings.forEach(b => {
    const slots = classSlotsByRoom[b.roomId] || [];
    slots.forEach(c => {
      if (isOverlapTime(c.start, c.end, b.start, b.end)) {
        clashes.push({ roomId: b.roomId, booking: b, classSlot: c });
      }
    });
  });

  const dateLine = `${dayNameThai(dObj)} ${formatThaiDateBE(dObj)}`;
  const title = `🗓️ สรุปการใช้ห้องประจำวัน (${dateLine})`;

  if (bookings.length === 0 && clashes.length === 0) {
    const msg = [
      tgSection('📣 Daily Digest'),
      tgLine('😺 ไม่มีกิจกรรมประจำวันนี้'),
      tgDivider()
    ].join('\n');
    return { title, message: msg };
  }

  const allRoomIds = new Set();
  bookings.forEach(b => allRoomIds.add(String(b.roomId)));
  clashes.forEach(x => allRoomIds.add(String(x.roomId)));

  const roomIdList = Array.from(allRoomIds).sort((a, b) => {
    return roomLabel(roomMap, a).localeCompare(roomLabel(roomMap, b), 'th');
  });

  const lines = [];
  lines.push(tgSection('📌 การจองวันนี้'));

  if (!bookings.length) {
    lines.push(tgLine('ไม่มีรายการจองวันนี้'));
  } else {
    const byRoom = {};
    bookings.forEach(b => {
      const rid = String(b.roomId);
      if (!byRoom[rid]) byRoom[rid] = [];
      byRoom[rid].push(b);
    });

    roomIdList.forEach(rid => {
      const list = byRoom[rid] || [];
      if (!list.length) return;

      list.sort((a, b) => String(a.start).localeCompare(String(b.start)));
      lines.push(tgBlank());
      lines.push(tgCardTitle(roomLabel(roomMap, rid)));

      list.forEach(b => {
        const time = `${b.start || '--:--'}-${b.end || '--:--'}`;
        const who = b.booker ? ` | ${b.booker}` : '';
        const phone = b.phone ? ` | ${b.phone}` : '';
        lines.push(tgLine(`${time} ${b.purpose}${who}${phone}`));
      });
    });
  }

  lines.push(tgBlank());
  lines.push(tgSection('⚠️ ทับตารางสอน'));

  if (!clashes.length) {
    lines.push(tgLine('ไม่พบรายการทับตารางสอน'));
  } else {
    clashes.sort((a, b) => {
      const r = roomLabel(roomMap, a.roomId).localeCompare(roomLabel(roomMap, b.roomId), 'th');
      if (r !== 0) return r;
      return String(a.booking.start).localeCompare(String(b.booking.start));
    });

    clashes.forEach(x => {
      const b = x.booking;
      const time = `${b.start || '--:--'}-${b.end || '--:--'}`;
      const who = b.booker ? ` | ${b.booker}` : '';
      lines.push(tgLine(`${roomLabel(roomMap, x.roomId)} | ${time} ${b.purpose}${who}`));
    });
  }

  lines.push(tgBlank());
  lines.push(tgDivider());

  return { title, message: lines.join('\n') };
}

function sendDailySummary(isDryRun) {
  // Normalize parameter (default false unless explicitly true)
  const dryRun = (isDryRun === true);
  const logs = [];
  const log = (msg) => {
    Logger.log(msg);
    logs.push(msg);
  };

  log(`🔔 [5AM Report] Start processing... Mode: ${dryRun ? 'DRY-RUN (Test)' : 'LIVE (Production)'}`);

  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const bookSheet = ss.getSheetByName(SHEET_NAMES.BOOKINGS);
    if (!bookSheet) {
      log('❌ Critical: Bookings sheet not found');
      return { ok: false, error: 'Bookings sheet missing', logs: logs };
    }

    // Time setup (Asia/Bangkok)
    const tz = 'Asia/Bangkok';
    const today = new Date();
    const todayStr = Utilities.formatDate(today, tz, 'yyyy-MM-dd');
    const todayDisplay = formatThaiDateFullHelper(today); // Helper เดิม

    log(`📅 Target Date: ${todayStr} (${todayDisplay})`);

    // Fetch & Filter
    const data = sheetToObjects(bookSheet);
    const roomMap = getRoomMapHelper(); // Helper เดิม

    // Status Normalizer
    const normalizeStatus = (v) => {
      const s = String(v || '').trim().toLowerCase();
      if (s === 'pending' || s === 'รออนุมัติ') return 'pending';
      if (s === 'approved' || s === 'approve' || s === 'อนุมัติ') return 'approved';
      return ''; // สนใจแค่อนุมัติ/รออนุมัติ สำหรับรายงานเช้า
    };

    const toISO = (v) => {
      if (!v) return '';
      if (v instanceof Date) return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
      const d = parseFlexibleDate(v);
      if (!d) return '';
      return Utilities.formatDate(d, tz, 'yyyy-MM-dd');
    };

    const todayEvents = data.filter(row => {
      const rowISO = toISO(row.BookingDate);
      if (!rowISO) return false;
      const st = normalizeStatus(row.Status);
      return rowISO === todayStr && (st === 'approved' || st === 'pending');
    });

    // Sort by Time
    todayEvents.sort((a, b) => String(a.StartTime || '').localeCompare(String(b.StartTime || '')));

    log(`✅ Found ${todayEvents.length} active bookings for today.`);

    // Build Message
    let message = `☀️ <b>สวัสดีเช้าวันใหม่! (${todayDisplay})</b>\n`;
    message += `สรุปรายการใช้ห้องเรียนวันนี้:\n${tgDivider()}\n\n`;

    if (todayEvents.length === 0) {
      message += `🍃 <b>วันนี้ไม่มีรายการจองห้องเรียนค่ะ</b>\n(ระบบทำงานปกติ)`;
    } else {
      message += `📢 พบทั้งหมด <b>${todayEvents.length}</b> รายการ\n\n`;
      
      todayEvents.forEach((b, index) => {
        const rName = roomMap[b.RoomID] || b.RoomID || 'ไม่ระบุห้อง';
        const time = `${formatTimeFromSheet(b.StartTime)} - ${formatTimeFromSheet(b.EndTime)}`;
        const st = normalizeStatus(b.Status);
        const icon = (st === 'approved') ? '✅' : '⏳';
        
        // Data cleaning
        const purpose = String(b.Purpose || '').trim();
        const booker = String(b.BookerName || '-').trim();
        const phone = normalizePhone(b.PhoneNumber); // Helper เดิม

        message += `${index + 1}. ${icon} <b>${time} น.</b> | ${rName}\n`;
        if (purpose) message += `   📝 ${purpose}\n`;
        message += `   👤 ${booker} ${phone ? '('+phone+')' : ''}\n\n`;
      });
      
      message += `ตรวจสอบรายละเอียดเพิ่มเติมได้ที่ Web App ค่ะ`;
    }

    // Send or Simulate
    if (dryRun) {
      log('🧪 Dry Run: Message generated but NOT sent to Telegram.');
      return { 
        ok: true, 
        dryRun: true, 
        count: todayEvents.length, 
        message: message, 
        logs: logs 
      };
    } else {
      // Production Send
      const res = sendTelegramMsgHelper(message, false);
      if (res.ok) {
        log('✅ Telegram sent successfully.');
        return { ok: true, dryRun: false, count: todayEvents.length, logs: logs };
      } else {
        log(`❌ Telegram failed: ${res.code} ${res.response}`);
        return { ok: false, error: 'Telegram API failed', details: res, logs: logs };
      }
    }

  } catch (e) {
    log(`❌ Exception in sendDailySummary: ${e.message}`);
    return { ok: false, error: e.message, logs: logs };
  }
}
// ANCHOR:SERVER.sendDailySummary:END

// ฟังก์ชันติดตั้ง Trigger (รันครั้งเดียวพอ)
function setupDailyTrigger() {
  // ลบ Trigger เก่าก่อนกันซ้ำ
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'sendDailySummary') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // สร้างใหม่ รันทุกวันตอน 05:00 - 06:00
  ScriptApp.newTrigger('sendDailySummary')
      .timeBased()
      .everyDays(1)
      .atHour(5)
      .create();
      
  Logger.log('✅ ตั้งเวลาแจ้งเตือนรายวัน (05:00 น.) เรียบร้อยแล้วค่ะ');
}



function formatTimeFromSheet(v) {
  if (v === null || v === undefined || v === '') return '';
  if (v instanceof Date) return Utilities.formatDate(v, "Asia/Bangkok", 'HH:mm');
  const str = String(v);
  if (/^\d{1,2}:\d{2}/.test(str)) {
    const parts = str.split(':');
    const h = parts[0].padStart(2, '0');
    const m = parts[1].slice(0, 2);
    return `${h}:${m}`;
  }
  return str;
}

function detectClassCollisionForBooking_(p) {
  const out = { isCollision: false, subject: '', instructor: '', startTime: '', endTime: '' };
  try {
    if (!p || !p.roomId || !p.bookingDate || !p.startTime || !p.endTime) return out;

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const shClass = ss.getSheetByName(SHEET_NAMES.CLASS_SCHEDULE || 'ClassSchedule');
    if (!shClass || shClass.getLastRow() < 2) return out;

    const dateObj = (p.bookingDate instanceof Date) ? new Date(p.bookingDate) : parseFlexibleDate(p.bookingDate);
    if (!dateObj) return out;
    dateObj.setHours(0, 0, 0, 0);

    const dayIndex = dateObj.getDay();
    const daysMap = [
      ['อาทิตย์', 'Sun', 'Sunday', 'อา.'],
      ['จันทร์', 'Mon', 'Monday', 'จ.'],
      ['อังคาร', 'Tue', 'Tuesday', 'อ.'],
      ['พุธ', 'Wed', 'Wednesday', 'พ.'],
      ['พฤหัสบดี', 'Thu', 'Thursday', 'พฤ.', 'Phu'],
      ['ศุกร์', 'Fri', 'Friday', 'ศ.'],
      ['เสาร์', 'Sat', 'Saturday', 'ส.']
    ];
    const targetDayKeywords = daysMap[dayIndex];

    const toMinutes = (t) => {
      const s = String(t || '').trim();
      const m = s.match(/^(\d{1,2})[:.](\d{2})$/);
      if (!m) return null;
      return Number(m[1]) * 60 + Number(m[2]);
    };

    const as = toMinutes(p.startTime);
    const ae = toMinutes(p.endTime);
    if (as == null || ae == null) return out;

    const values = shClass.getRange(2, 1, shClass.getLastRow() - 1, 8).getDisplayValues();
    for (let i = 0; i < values.length; i++) {
      const row = values[i];
      const roomId = String(row[0] || '').trim();
      if (roomId !== String(p.roomId)) continue;

      const classDay = String(row[1] || '').toLowerCase();
      const isDayMatch = targetDayKeywords.some(kw => classDay.includes(String(kw).toLowerCase()));
      if (!isDayMatch) continue;

      const validFrom = parseFlexibleDate(row[6]);
      const validTo = parseFlexibleDate(row[7]);
      if (validFrom) validFrom.setHours(0, 0, 0, 0);
      if (validTo) validTo.setHours(0, 0, 0, 0);

      let inRange = true;
      if (validFrom && validTo) inRange = (dateObj.getTime() >= validFrom.getTime() && dateObj.getTime() <= validTo.getTime());
      else if (validFrom) inRange = (dateObj.getTime() >= validFrom.getTime());
      else if (validTo) inRange = (dateObj.getTime() <= validTo.getTime());
      if (!inRange) continue;

      const cs = toMinutes(formatTimeFromSheet(row[2]));
      const ce = toMinutes(formatTimeFromSheet(row[3]));
      if (cs == null || ce == null) continue;

      const overlap = (as < ce && cs < ae);
      if (overlap) {
        out.isCollision = true;
        out.subject = String(row[4] || '').trim();
        out.instructor = String(row[5] || '').trim();
        out.startTime = formatTimeFromSheet(row[2]);
        out.endTime = formatTimeFromSheet(row[3]);
        return out;
      }
    }
  } catch (e) {
    Logger.log('detectClassCollisionForBooking_ error: ' + e);
  }
  return out;
}


function updateStatistics(roomId, bookingDate, action) {
  try {
    if (!roomId || !bookingDate) return;
    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sh = ss.getSheetByName(SHEET_NAMES.STATISTICS);
    if (!sh) {
      sh = ss.insertSheet(SHEET_NAMES.STATISTICS);
      sh.getRange(1,1,1,4).setValues([['Date','RoomID','BookingCount','OverrideCount']]);
    }
    
    // FIX: ใช้ helper function
    const date = (bookingDate instanceof Date) ? formatDateISO(bookingDate) : String(bookingDate).split('T')[0];
    
    const data = sh.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      const rowDate = (data[i][0] instanceof Date) ? formatDateISO(data[i][0]) : String(data[i][0]).split('T')[0];
      if (rowDate === date && String(data[i][1]) === String(roomId)) {
        rowIndex = i;
        break;
      }
    }
    if (rowIndex >= 0) {
      const currentCount = parseInt(data[rowIndex][2]) || 0;
      let newCount = currentCount;
      if (action === 'create') newCount++;
      else if (action === 'cancel') newCount = Math.max(0, newCount - 1);
      sh.getRange(rowIndex + 1, 3).setValue(newCount);
    } else if (action === 'create') {
      sh.appendRow([date, roomId, 1, 0]);
    }
  } catch (err) {
    Logger.log('updateStatistics Error: ' + err);
  }
}

function clearRoomsCache() {
  const c = CacheService.getScriptCache();
  c.remove('rooms_json');
  c.remove('rooms_json_v2');
  Logger.log('🧹 ล้าง Cache ข้อมูลห้องเรียบร้อยแล้วค่ะ! โหลดใหม่ได้เลย');
}

// ✅ NEW (no underscore): readBookingById
// อ่าน booking 1 รายการจากชีต Bookings โดย map จาก header
function readBookingById(bookingId) {
  try {
    const id = String(bookingId || '').trim();
    if (!id) return fail_('readBookingById: missing bookingId');

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sh = ss.getSheetByName((SHEET_NAMES && SHEET_NAMES.BOOKINGS) ? SHEET_NAMES.BOOKINGS : 'Bookings');
    if (!sh) return fail_('readBookingById: sheet Bookings not found');

    const values = sh.getDataRange().getValues();
    if (!values || values.length < 2) return fail_('readBookingById: no data');

    const headers = values[0].map(h => String(h || '').trim());
    const col = {};
    headers.forEach((h, i) => { if (h) col[h] = i; });

    const idx = col['BookingID'];
    if (idx == null) return fail_('readBookingById: missing BookingID header');

    for (let r = 1; r < values.length; r++) {
      const row = values[r];
      const rid = String(row[idx] || '').trim();
      if (rid === id) {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = row[i]; });
        return ok_(obj);
      }
    }

    return fail_('readBookingById: not found ' + id);
  } catch (e) {
    return fail_('readBookingById error: ' + (e.message || e));
  }
}

// ✅ NEW (no underscore): formatTimeText
// normalize Date/number/string -> "HH:mm"
function formatTimeText(v) {
  var tz = Session.getScriptTimeZone() || 'Asia/Bangkok';

  if (v == null || v === '') return '';

  // remove leading apostrophe text marker
  if (typeof v === 'string') {
    var s = v.replace(/^'+/, '').trim();
    if (!s) return '';
    // already HH:mm
    var m1 = s.match(/^(\d{1,2}):(\d{2})$/);
    if (m1) return String(m1[1]).padStart(2, '0') + ':' + String(m1[2]).padStart(2, '0');
    // if contains HH:mm:ss
    var m2 = s.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
    if (m2) return String(m2[1]).padStart(2, '0') + ':' + String(m2[2]).padStart(2, '0');
    // try date parse
    var dtS = new Date(s);
    if (!isNaN(dtS.getTime())) return Utilities.formatDate(dtS, tz, 'HH:mm');
    return s; // fallback
  }

  // Date object
  if (v instanceof Date && !isNaN(v.getTime())) {
    return Utilities.formatDate(v, tz, 'HH:mm');
  }

  // numeric time serial (Sheets)
  if (typeof v === 'number' && isFinite(v)) {
    var totalMin = Math.round(v * 24 * 60);
    var hh = Math.floor(totalMin / 60) % 24;
    var mm = totalMin % 60;
    return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  }

  return String(v).trim();
}


// ✅ NEW (no underscore): generateDailySummaryForDate
// สร้างข้อความสรุปรายการจองห้องประจำวัน (Log-only) จากชีต Bookings จริง
function generateDailySummaryForDate(dateISO) {
  const tz = Session.getScriptTimeZone() || 'Asia/Bangkok';

  const toThaiDateText = (d) => {
    // "7 มกราคม 2569"
    const months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
    const dt = (d instanceof Date) ? d : new Date(String(d || '') + 'T00:00:00');
    if (isNaN(dt.getTime())) return String(d || '');
    const day = dt.getDate();
    const month = months[dt.getMonth()];
    const year = dt.getFullYear() + 543;
    return day + ' ' + month + ' ' + year;
  };

  const toDDMMYYYY = (d) => {
    const dt = (d instanceof Date) ? d : new Date(String(d || '') + 'T00:00:00');
    if (isNaN(dt.getTime())) return String(d || '');
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yy = String(dt.getFullYear() + 543);
    return dd + '/' + mm + '/' + yy;
  };

  const stripLeadingApostrophe = (s) => String(s == null ? '' : s).replace(/^'+/, '').trim();

  try {
    const iso = String(dateISO || '').trim();
    if (!iso) return fail_('generateDailySummaryForDate: missing dateISO');

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sh = ss.getSheetByName((SHEET_NAMES && SHEET_NAMES.BOOKINGS) ? SHEET_NAMES.BOOKINGS : 'Bookings');
    if (!sh) return fail_('generateDailySummaryForDate: Bookings sheet not found');

    const values = sh.getDataRange().getValues();
    if (!values || values.length < 2) {
      return ok_({ dateISO: iso, message: '🌅 สรุปงานประจำวัน: ' + toDDMMYYYY(iso) + '\n🍃 วันนี้ไม่มีรายการจองห้องเรียน\n(ระบบทำงานปกติ)\n— ออกรายงานอัตโนมัติ 05:00 น. —' });
    }

    const headers = values[0].map(h => String(h || '').trim());
    const col = {};
    headers.forEach((h, i) => { if (h) col[h] = i; });

    // required for summary
    const need = ['BookingDate','StartTime','EndTime','RoomID','Purpose','BookerName','PhoneNumber','Equipment','BookingID','Status'];
    const miss = need.filter(h => col[h] == null);
    if (miss.length) return fail_('generateDailySummaryForDate: missing headers ' + miss.join(', '));

    // filter same day + only statuses: รออนุมัติ/อนุมัติ (you can decide)
    const items = [];
    for (let r = 1; r < values.length; r++) {
      const row = values[r];
      const d = row[col.BookingDate];
      const dIso = (d instanceof Date && !isNaN(d.getTime()))
        ? Utilities.formatDate(d, tz, 'yyyy-MM-dd')
        : String(d || '').trim();

      if (dIso !== iso) continue;

      const status = String(row[col.Status] || '').trim();
      // ✅ daily summary show all 4 statuses? -> ตาม scope "มีสถานะการจองตามสถานะต่างๆ"
      // แต่รายงาน "รายการใช้ห้องเรียนวันนี้" ควรแสดงเฉพาะ รออนุมัติ/อนุมัติ (ไม่เอายกเลิก)
      const norm = (typeof normalizeBookingStatus === 'function') ? normalizeBookingStatus(status) : status;
      if (norm === 'ยกเลิกการจอง') continue;

        items.push({
  start: formatTimeText(row[col.StartTime]),
  end: formatTimeText(row[col.EndTime]),
        start: String(row[col.StartTime] || '').trim(),
        end: String(row[col.EndTime] || '').trim(),
        roomId: String(row[col.RoomID] || '').trim(),
        purpose: String(row[col.Purpose] || '').trim(),
        booker: String(row[col.BookerName] || '').trim(),
        phone: stripLeadingApostrophe(row[col.PhoneNumber] || ''),
        equip: String(row[col.Equipment] || '').trim(),
        bookingId: String(row[col.BookingID] || '').trim(),
        status: norm
      });
    }

    // sort by start time
    items.sort((a, b) => (a.start || '').localeCompare(b.start || ''));

    if (!items.length) {
      return ok_({
        dateISO: iso,
        message: '🌅 สรุปงานประจำวัน: ' + toDDMMYYYY(iso) +
          '\n🍃 วันนี้ไม่มีรายการจองห้องเรียน\n(ระบบทำงานปกติ)\n— ออกรายงานอัตโนมัติ 05:00 น. —'
      });
    }

    const dateThai = toThaiDateText(iso);

    let msg = '☀️ สวัสดีเช้าวันใหม่! (' + dateThai + ')\n' +
      'สรุปรายการใช้ห้องเรียนวันนี้:\n' +
      '──────────\n' +
      '📢 พบทั้งหมด ' + items.length + ' รายการ\n';

    items.forEach((it, i) => {
      const num = (i + 1) + '. ';
      const statusIcon = (it.status === 'อนุมัติ') ? '✅' : '⏳';
      msg += num + statusIcon + ' ' + it.start + ' - ' + it.end + ' น. | ห้อง ' + (it.roomId || '-') + '\n' +
        '   📝 วัตถุประสงค์: ' + (it.purpose || '-') + '\n' +
        '   👤 ผู้จอง: ' + (it.booker || '-') + ' (โทร: ' + (it.phone || '-') + ')\n' +
        '   🧰 อุปกรณ์: ' + (it.equip || '-') + '\n' +
        '   🔎 BookingID: ' + (it.bookingId || '-') + '\n';
    });

    return ok_({ dateISO: iso, message: msg });

  } catch (e) {
    return fail_('generateDailySummaryForDate error: ' + (e.message || e));
  }
}

// ✅ NEW HELPER V2: แยกชิ้นส่วนวันที่และเวลา (เหมือนเดิม)
function getThaiDateAndTimeParts(dateRaw, startRaw, endRaw) {
  try {
    const d = parseFlexibleDate(dateRaw);
    if (!d) return { dateLabel: '-', timeLabel: '' };

    const thaiMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    const dateLabel = `${d.getDate()} ${thaiMonths[d.getMonth()]} ${d.getFullYear() + 543}`;

    const fmtTime = (t) => {
      const s = formatTimeFromSheet(t); 
      return s ? s.replace(':', '.') : '';
    };

    const sTime = fmtTime(startRaw);
    const eTime = fmtTime(endRaw);
    let timeLabel = '';

    if (sTime && eTime) {
      timeLabel = `เวลา ${sTime} - ${eTime} น.`;
    }

    return { dateLabel, timeLabel };
  } catch (e) {
    return { dateLabel: String(dateRaw || '-'), timeLabel: '' };
  }
}

// ============================================
// ✅ PDF REPORT GENERATOR (Server Side) - 9pt Uniform Content
// ============================================
// ============================================
// ✅ PDF REPORT GENERATOR (Server Side) - Clean Blank Cells
// ============================================

function generatePdfReport(payload) {
  try {
    const month = Number(payload.month);
    const year = Number(payload.year); 
    if (!month || !year) return fail_('ข้อมูลเดือน/ปีไม่ถูกต้อง');

    const ss = SpreadsheetApp.openById(SHEET_ID);
    const sh = ss.getSheetByName(SHEET_NAMES.BOOKINGS || 'Bookings');
    const data = sheetToObjects(sh);
    const roomsMap = getRoomMapHelper(); 

    const thaiMonths = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];

    // Filter & Sort
    const items = data.filter(r => {
      const d = parseFlexibleDate(r.BookingDate);
      if (!d) return false;
      const st = String(r.Status || '').trim();
      if (st === 'ยกเลิก' || st === 'cancelled') return false;
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    }).sort((a, b) => {
      const da = parseFlexibleDate(a.BookingDate) || 0;
      const db = parseFlexibleDate(b.BookingDate) || 0;
      if (da !== db) return da - db;
      return String(a.StartTime).localeCompare(String(b.StartTime));
    });

    // Generate Rows
    let rowsHtml = '';
    if (items.length === 0) {
      rowsHtml = '<tr><td colspan="8" style="text-align:center; padding: 20px; color:#777;">-- ไม่พบรายการจองในเดือนนี้ --</td></tr>';
    } else {
      items.forEach((r, i) => {
        const roomName = roomsMap[r.RoomID] || r.RoomID || '-';
        const purpose = String(r.Purpose || '').replace(/</g, '&lt;').substring(0, 200);
        const phone = normalizePhone(r.PhoneNumber);
        
        const dtParts = getThaiDateAndTimeParts(r.BookingDate, r.StartTime, r.EndTime);
        
        // ดึงข้อมูลและ Trim ช่องว่าง
        const software = String(r.Software || '').trim().replace(/,\s*/g, ', ');
        const equipment = String(r.Equipment || '').trim().replace(/,\s*/g, ', ');
        const remark = String(r.Remark || '').trim().replace(/,\s*/g, ', ');

        // CHANGE: ใช้ || '' แทน || '-' เพื่อให้เป็นช่องว่างจริงๆ เมื่อไม่มีข้อมูล
        rowsHtml += `
          <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td>
                <strong>${dtParts.dateLabel}</strong><br>
                <span style="color:#444;">${dtParts.timeLabel}</span>
            </td>
            <td>${roomName}</td>
            <td>${purpose}</td>
            <td>${software || ''}</td>
            <td>
              ${r.BookerName || ''}<br>
              <span style="color:#666; font-size: 0.9em;">โทร ${phone || '-'}</span>
            </td>
            <td>${equipment || '-'}</td>
            <td>${remark || ''}</td>
          </tr>
        `;
      });
    }

    const monthName = thaiMonths[month - 1];
    const yearTh = year + 543;
    const printDate = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm น.');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;700&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 landscape; margin: 1cm; }

          body {
            font-family: 'Sarabun', sans-serif;
            font-size: 9pt; 
            color: #000;
            line-height: 1.35;
          }

          /* Header */
          .header { text-align: center; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 16pt; font-weight: bold; }
          .header h2 { margin: 4px 0 0 0; font-size: 14pt; font-weight: bold; }
          .sub-header { margin-top: 4px; font-size: 11pt; font-weight: bold; }

          /* Table */
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            table-layout: fixed;
          }
          
          th, td {
            border: 1px solid #cccccc;
            padding: 6px 5px;
            vertical-align: top;
            overflow-wrap: break-word;
            word-break: break-word;
          }
          
          th {
            border: 1px solid #b0b0b0;
            background-color: #f5f5f5;
            font-weight: bold;
            text-align: center;
            vertical-align: middle;
            font-size: 10pt;
          }
          
          td { 
            font-weight: normal; 
            font-size: 9pt;
          }

          /* Footer */
          .summary { margin-top: 15px; font-weight: bold; font-size: 9pt; text-align: right; }
          .footer {
            margin-top: 30px;
            border-top: 1px solid #ccc;
            padding-top: 8px;
            font-size: 9pt;
            color: #555;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .system-name {
            font-size: 11pt;
            font-weight: bold;
            color: #000;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>รายงานสรุปการจองห้องเรียน</h1>
          <h2>มหาวิทยาลัยสวนดุสิต ศูนย์การศึกษาลำปาง</h2>
          <div class="sub-header">ประจำเดือน ${monthName} พุทธศักราช ${yearTh}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th width="3%">#</th>
              <th width="14%">วัน/เวลา</th>
              <th width="12%">ห้องเรียน</th>
              <th width="22%">รายละเอียด</th>
              <th width="8%">Software</th>
              <th width="16%">ผู้จอง</th>
              <th width="15%">อุปกรณ์</th>
              <th width="10%">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="summary">
           รวมจำนวนรายการทั้งสิ้น: ${items.length} รายการ
        </div>

        <div class="footer">
           <span class="system-name">ระบบจองห้องเรียนออนไลน์</span>
           <span>พิมพ์เมื่อ: ${printDate}</span>
        </div>
      </body>
      </html>
    `;

    const blob = Utilities.newBlob(html, MimeType.HTML, `Report.html`);
    const pdf = blob.getAs(MimeType.PDF);
    const base64 = Utilities.base64Encode(pdf.getBytes());

    return ok_(base64);

  } catch (e) {
    Logger.log('generatePdfReport error: ' + e);
    return fail_('สร้าง PDF ไม่สำเร็จ: ' + e.message);
  }
}

function selfTest() {
  var result = { ok: true, logs: [], details: {}, outputs: {} };
  var createdIds = [];

  var log = function (msg, success) {
    var isOk = (success !== false);
    var icon = isOk ? '✅' : '❌';
    var line = icon + ' ' + msg;
    result.logs.push(line);
    Logger.log(line);
    if (!isOk) result.ok = false;
  };

  var group = function (title) {
    Logger.log('----------------------------------------');
    Logger.log(title);
    Logger.log('----------------------------------------');
    result.logs.push('--- ' + title + ' ---');
  };

  var stripLeadingApostrophe = function (s) {
    return String(s == null ? '' : s).replace(/^'+/, '').trim();
  };

  var safePushId = function (id) {
    if (!id) return;
    if (createdIds.indexOf(id) === -1) createdIds.push(id);
  };

  var mustHave = function (fnName) {
    if (typeof this[fnName] !== 'function') {
      log('MISSING FUNCTION: ' + fnName, false);
      return false;
    }
    return true;
  };

  Logger.log('========================================');
  Logger.log('🧪 SELF TEST (FULL SYSTEM DIAGNOSTICS)');
  Logger.log('========================================');

  var tz = '';
  var isoDate = '';
  var testRoomId = '';
  var phone = '0812345678';

  var bookingId = '';
  var seedId = '';
  var conflictId = '';

  try {
    // ====================================================
    // 0) Preflight (avoid hard-fail)
    // ====================================================
    group('0) Preflight');
    var okFns =
      mustHave.call(this, 'getInitialData') &&
      mustHave.call(this, 'createBooking') &&
      mustHave.call(this, 'updateBookingStatus') &&
      mustHave.call(this, 'approveBooking') &&
      mustHave.call(this, 'processBookingAction') &&
      mustHave.call(this, 'isDayMatch_');

    // Added helpers
    okFns = okFns && mustHave.call(this, 'readBookingById') && mustHave.call(this, 'sendDailySummary');

    if (!okFns) {
      result.details.fatal = 'Missing required functions for selfTest';
      return { ok: false, error: result.details.fatal, data: result };
    }

    // ====================================================
    // 1) Environment + Infrastructure
    // ====================================================
    group('1) Environment & Spreadsheet');
    tz = Session.getScriptTimeZone() || 'Asia/Bangkok';
    log('Server Timezone: ' + tz, true);

    var ss = SpreadsheetApp.openById(SHEET_ID);
    log('Connected to Spreadsheet: ' + ss.getName(), true);

    // sheet check
    var shBk = ss.getSheetByName((SHEET_NAMES && SHEET_NAMES.BOOKINGS) ? SHEET_NAMES.BOOKINGS : 'Bookings');
    var shRm = ss.getSheetByName((SHEET_NAMES && SHEET_NAMES.ROOMS) ? SHEET_NAMES.ROOMS : 'Rooms');
    var shCs = ss.getSheetByName((SHEET_NAMES && SHEET_NAMES.CLASS_SCHEDULE) ? SHEET_NAMES.CLASS_SCHEDULE : 'ClassSchedule');
    log('Sheet Bookings exists', !!shBk);
    log('Sheet Rooms exists', !!shRm);
    log('Sheet ClassSchedule exists', !!shCs);
    if (!shBk || !shRm || !shCs) throw new Error('Missing required sheets');

    // ====================================================
    // 2) API + Initial Data
    // ====================================================
    group('2) API & Initial Data');
    var initData = getInitialData();
    var roomsCount = (initData && initData.ok && initData.data && initData.data.rooms) ? initData.data.rooms.length : 0;
    log('getInitialData(): Rooms loaded -> ' + roomsCount, initData && initData.ok);

    if (!initData || !initData.ok || !initData.data || !initData.data.rooms || !initData.data.rooms.length) {
      throw new Error('getInitialData() failed or no rooms found.');
    }

    var firstRoom = initData.data.rooms[0];
    testRoomId = firstRoom ? (firstRoom.RoomID || firstRoom.id || firstRoom.roomId) : '';
    if (!testRoomId) throw new Error('Cannot determine valid RoomID for testing');

    // ====================================================
    // 3) Test Parameters
    // ====================================================
    group('3) Test Parameters');
    var baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 45); // Future date to avoid clutter
    isoDate = Utilities.formatDate(baseDate, tz, 'yyyy-MM-dd');
    log('Test dateISO=' + isoDate + ', roomId=' + testRoomId + ', phone=' + phone, true);

    // ✅ selfTest: never send Telegram real for bookings
    var createOpt = { isDryRun: true, skipTelegram: true };
    var statusOpt = { isDryRun: true, skipTelegram: false }; // Allow dry-run telegram logs

    // ====================================================
    // 4) Status Flow (4 statuses)
    // ====================================================
    group('4) Status Flow (รออนุมัติ | อนุมัติ | ไม่อนุมัติ | ยกเลิกการจอง)');
    var baseBooking = createBooking({
      bookerName: 'Auto Test StatusFlow',
      phoneNumber: phone,
      roomId: testRoomId,
      bookingDate: isoDate,
      startTime: '13:00',
      endTime: '16:00',
      purpose: 'Auto Test Status Flow'
    }, createOpt);

    log('Create booking for status flow', baseBooking && baseBooking.ok);
    if (!baseBooking || !baseBooking.ok) throw new Error('createBooking failed: ' + (baseBooking && (baseBooking.error || baseBooking.message) || ''));

    bookingId = baseBooking.data.bookingId;
    safePushId(bookingId);
    log('BookingID: ' + bookingId, !!bookingId);

    var st1 = updateBookingStatus(bookingId, 'รออนุมัติ', 'AutoTest', '', statusOpt);
    log('Update status -> รออนุมัติ', st1 && st1.ok);

    var st2 = updateBookingStatus(bookingId, 'อนุมัติ', 'AutoTest', '', statusOpt);
    log('Update status -> อนุมัติ', st2 && st2.ok);

    var st3 = updateBookingStatus(bookingId, 'ไม่อนุมัติ', 'AutoTest', 'ไม่ผ่านเงื่อนไข', statusOpt);
    log('Update status -> ไม่อนุมัติ', st3 && st3.ok);

    var st4 = updateBookingStatus(bookingId, 'ยกเลิกการจอง', 'AutoTest', 'ผู้จองยกเลิก', statusOpt);
    log('Update status -> ยกเลิกการจอง', st4 && st4.ok);

    // Phone verify
    var rowBase = readBookingById(bookingId);
    if (rowBase && rowBase.ok && rowBase.data) {
      var storedPhone = stripLeadingApostrophe(rowBase.data.PhoneNumber || '');
      log('Phone leading zero preserved: ' + storedPhone, storedPhone === phone);
    }

    // ====================================================
    // 5) Conflict + Override
    // ====================================================
    group('5) Conflict & Override (Real DB)');

    var seed = createBooking({
      bookerName: 'Auto Test Seed',
      phoneNumber: phone,
      roomId: testRoomId,
      bookingDate: isoDate,
      startTime: '08:00',
      endTime: '10:00',
      purpose: 'Auto Test Seed for Conflict'
    }, createOpt);

    log('Create seed booking', seed && seed.ok);
    seedId = seed.data ? seed.data.bookingId : '';
    safePushId(seedId);

    var approveSeed = approveBooking({ bookingId: seedId, actor: 'AutoTest' });
    log('Approve seed booking', approveSeed && approveSeed.ok);

    var conflict = createBooking({
      bookerName: 'Auto Test Conflict',
      phoneNumber: phone,
      roomId: testRoomId,
      bookingDate: isoDate,
      startTime: '09:00',
      endTime: '11:00',
      purpose: 'Auto Test Conflict Booking'
    }, createOpt);

    log('Create conflict booking', conflict && conflict.ok);
    conflictId = conflict.data ? conflict.data.bookingId : '';
    safePushId(conflictId);

    var isConflict = (conflict.data && conflict.data.isConflict === true);
    log('Conflict flagged correctly', isConflict);

    // Normal approve must be blocked
    var appRes = approveBooking({ bookingId: conflictId, actor: 'AutoTest' });
    var blockedOk = (appRes && appRes.ok === false);
    log('Block normal approve (must be blocked)', blockedOk);

    // Override approve must pass
    var overRes = approveBooking({ bookingId: conflictId, actor: 'AutoTest', isOverride: true });
    var overrideOk = (overRes && overRes.ok === true);
    log('Allow override approve (must pass)', overrideOk);

    // ====================================================
    // 6) DayMatch Contract
    // ====================================================
    group('6) DayMatch Contract (Thu must not match Wed)');
    var thu = new Date('2026-01-08T00:00:00'); // Thursday
    log('Thu matches "พฤหัสบดี"', isDayMatch_(thu, 'พฤหัสบดี') === true);
    log('Thu matches "Thu"', isDayMatch_(thu, 'Thu') === true);
    log('Thu must NOT match "พุธ"', isDayMatch_(thu, 'พุธ') === false);

    // ====================================================
    // 7) Daily Summary (Real Logic + Dry Run)
    // ====================================================
    group('7) Daily Summary (Real Logic Dry-Run)');

    // Test A: เรียกฟังก์ชันจริงในโหมด Dry-Run
    // CHANGE: ใช้ sendDailySummary(true) แทน generateDailySummaryForDate
    if (typeof sendDailySummary === 'function') {
      var reportRes = sendDailySummary(true); // true = Dry Run
      var isReportOk = reportRes && reportRes.ok === true;
      var isDryRunConfirmed = reportRes && reportRes.dryRun === true;
      
      log('5AM Report (Dry-Run) executed', isReportOk);
      log('Safety Check: dryRun mode confirmed', isDryRunConfirmed);
      
      if (reportRes && reportRes.logs && reportRes.logs.length > 0) {
         // Show last internal log
         log('Report Log: ' + reportRes.logs[reportRes.logs.length - 1], true);
      }
      
      if (!isDryRunConfirmed && isReportOk) {
          log('WARNING: sendDailySummary returned ok but dryRun is false! (Real message might have been sent)', false);
      }

      result.outputs.dailyReportTest = reportRes;
    } else {
      log('MISSING FUNCTION: sendDailySummary', false);
    }

    // Test B: Legacy Helper (Optional Check)
    if (typeof generateDailySummaryForDate === 'function') {
        var msgHasRes = generateDailySummaryForDate(isoDate);
        log('Legacy Summary Helper generated (Backup Check)', msgHasRes && msgHasRes.ok);
    }

    result.outputs.bookingIds = createdIds;

    log('✅ selfTest COMPLETED', result.ok);

  } catch (e) {
    log('CRITICAL SERVER ERROR: ' + (e.message || e), false);
    result.details.stack = e.stack;
  } finally {
    // ====================================================
    // 8) Cleanup (ALWAYS RUN)
    // ====================================================
    group('8) Cleanup (finally)');
    try {
      createdIds.forEach(function (id) {
        if (!id) return;
        try {
          // ใช้ processBookingAction เพื่อความชัวร์ (bypass logic อื่นๆ)
          processBookingAction({
            bookingId: id,
            action: 'cancel',
            remark: 'Auto Cleanup',
            role: 'admin',
            actor: 'AutoTest',
            isDryRun: true,
            skipTelegram: true
          });
          Logger.log('✅ Cleanup cancelled: ' + id);
        } catch (x) {
          Logger.log('❌ Cleanup failed: ' + id + ' -> ' + (x.message || x));
          result.ok = false;
        }
      });
      log('Cleanup finished. Total=' + createdIds.length, true);
    } catch (ce) {
      log('Cleanup wrapper failed: ' + (ce.message || ce), false);
    }
  }

  return { ok: result.ok, data: result };
}

function selfTestPdfReport() {
  const log = (label, pass, detail) => {
    Logger.log((pass ? 'PASS' : 'FAIL') + ' | ' + label + (detail ? ' | ' + detail : ''));
  };

  // 1) DateTime Thai format
  const s = formatThaiDateTimeRangePdf(new Date('2025-10-18T00:00:00+07:00'), '07:00', '16:00');
  const re = /^\d{1,2}\s[ก-๙]+\s\d{4}\sเวลา\s\d{2}\.\d{2}(\s-\s\d{2}\.\d{2})?\sน\.$/;
  log('Thai datetime format', re.test(s), s);

  // 2) Header contains “อุปกรณ์ที่ต้องใช้”
  const src = String(generatePdfReport);
  log('PDF header has equipment column', src.includes('อุปกรณ์ที่ต้องใช้'));

  // 3) Table font-size is set
  log('PDF table font-size set', /font-size:\s*10\.5pt/.test(src), 'expect 10.5pt');
}
