// ทดสอบ parser ตารางเรียน (parseTimetableExcelWorkbook) + parseClassGroup กับไฟล์จริง 2-69
// รัน: node docs/test-class-import.js   (ไม่แตะระบบจริง — read-only)
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const ROOT = path.join(__dirname, '..');
const window = { location: { hostname: 'localhost' } };
global.window = window;
global.XLSX = XLSX;

// โหลด config.js (registry + parseClassGroup)
eval(fs.readFileSync(path.join(ROOT, 'js', 'config.js'), 'utf8'));

// ดึงเฉพาะฟังก์ชัน parser จาก app.js (slice ระหว่าง marker)
const appSrc = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');
const start = appSrc.indexOf('function parseTimetableExcelWorkbook(wb)');
const end = appSrc.indexOf('// จับคู่คาบที่อ่านได้กับคาบเดิม');
if (start === -1 || end === -1 || end < start) throw new Error('ไม่พบ parser ใน app.js');
eval(appSrc.slice(start, end));

const file = 'D:/ตารางสอน 69/ล่าสุด ตารางเรียน  2-69.xlsx';
const wb = XLSX.read(fs.readFileSync(file), { type: 'buffer' });
const courses = parseTimetableExcelWorkbook(wb);

console.log('=== สรุปผล parser ===');
console.log('จำนวนคาบที่อ่านได้:', courses.length);

const byGroup = {};
let badDay = 0, badTime = 0, badRoom = 0, noTeacher = 0;
courses.forEach(c => {
  byGroup[c.groupLabel] = (byGroup[c.groupLabel] || 0) + 1;
  if (c.skipReason === 'วันไม่อ่านได้') badDay++;
  if (c.skipReason === 'เวลาไม่อ่านได้') badTime++;
  if (!c.room) badRoom++;
  if (!c.instructor) noTeacher++;
});
console.log('\n=== ตามกลุ่ม ===');
Object.keys(byGroup).sort().forEach(g => console.log(`  ${g}: ${byGroup[g]} คาบ`));
console.log(`\nวันไม่อ่านได้: ${badDay}, เวลาไม่อ่านได้: ${badTime}, ไม่มีห้อง: ${badRoom}, ไม่มีอาจารย์: ${noTeacher}`);

console.log('\n=== ตัวอย่าง 6 คาบแรก ===');
courses.slice(0, 6).forEach(c =>
  console.log(`  [${c.groupLabel}] ${c.subject} | ${c.day} | ${c.startTime}-${c.endTime} | ห้อง ${c.room} | ${c.instructor}`));

console.log('\n=== parseClassGroup ทุกกลุ่ม (เรียงด้วย sortKey) ===');
const labels = [...new Set(courses.map(c => c.groupLabel))];
const parsed = labels.map(l => window.classGroupTools.parseClassGroup(l));
parsed.sort((a, b) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0));
parsed.forEach(p => console.log(`  ${p.raw.padEnd(18)} → ${p.majorKey.padEnd(9)} ปีที่${p.yearNo} ${p.plan || ''}${p.leftover ? ' ตกค้าง' : ''} [${p.colorClass}] :: ${p.displayLabel}`));

// ตรวจเวลาทั้งหมดรูปแบบ HH:MM และ start < end
let timeErr = 0;
courses.forEach(c => {
  if (!c.startTime) return;
  if (!/^\d{2}:\d{2}$/.test(c.startTime) || !/^\d{2}:\d{2}$/.test(c.endTime)) timeErr++;
  else if (c.startTime >= c.endTime) timeErr++;
});
console.log('\nเวลารูปแบบผิด/กลับด้าน:', timeErr);
// ตรวจ buildClassImportPlan: คาบไร้ห้อง → "นอกสถานที่" (add), ห้องไม่พบในระบบ → skip
const planSrcStart = appSrc.indexOf('function buildClassImportPlan(courses)');
const planSrcEnd = appSrc.indexOf('function refreshClassImportApplyBtn()');
eval(appSrc.slice(planSrcStart, planSrcEnd));
window.__classScheduleState = {
  rows: [],
  rooms: [{ id: '304', name: '304' }]
};
const plan = buildClassImportPlan([
  { groupLabel: 'อาหาร66', subject: 'ฝึกงาน', day: 'พฤหัสบดี', startTime: '08:00', endTime: '12:00', room: '', instructor: 'อ.ทดสอบ', source: 't', skipReason: '' },
  { groupLabel: 'อาหาร67', subject: 'วิชาห้องผิด', day: 'จันทร์', startTime: '08:00', endTime: '10:00', room: '999', instructor: '', source: 't', skipReason: '' },
  { groupLabel: 'อาหาร69 แผน ก', subject: 'วิชาปกติ', day: 'จันทร์', startTime: '08:00', endTime: '10:00', room: '304', instructor: '', source: 't', skipReason: '' }
]);
const pNoRoom = plan[0], pBadRoom = plan[1], pOk = plan[2];
if (pNoRoom.room !== 'นอกสถานที่' || pNoRoom.status !== 'add') throw new Error('คาบไร้ห้องควร add เป็นนอกสถานที่');
if (pBadRoom.status !== 'skip') throw new Error('ห้องไม่พบในระบบควร skip');
if (pOk.status !== 'add' || pOk.room !== '304') throw new Error('คาบห้องปกติควร add');
console.log('\n=== buildClassImportPlan ===');
console.log(`  ไร้ห้อง → ${pNoRoom.room} (${pNoRoom.status}) | ห้อง 999 → ${pBadRoom.status} | ห้อง 304 → ${pOk.status} ✓`);

const fails = badDay + badTime + timeErr;
console.log(fails === 0 ? '\nRESULT: PASS' : `\nRESULT: ${fails} ปัญหา`);
process.exit(fails === 0 ? 0 : 1);
