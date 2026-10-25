# Schedule Drag & Drop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ลากการ์ดคาบเรียนในตารางสอน admin ย้าย/สลับวัน-เวลา ด้วย Pointer Events (เมาส์+นิ้ว) บันทึกแบบ batch ตามระบบเดิม

**Architecture:** Delegation บน `#classScheduleGrid` ผูกครั้งเดียว (grid re-render ทั้งก้อนทุกครั้ง) · ghost clone ตาม pointer · hit-test `td.se-cell` ด้วย `elementFromPoint` · mutation บน `window.__classScheduleState.rows` + `setScheduleEditorDirty(true)` + `renderScheduleGrid()`

**Tech Stack:** Vanilla JS (Pointer Events), CSS3, Bootstrap modal เดิม (`#scheduleConfirmModal`), ทดสอบผ่าน playwright-cli (ad-hoc, ไม่มี committed test infra)

**Spec:** `docs/superpowers/specs/2026-10-25-schedule-drag-drop-design.md`

## Global Constraints

- แก้เฉพาะ `day/startTime/endTime` — `validFrom/validTo` ค้างกับวิชาเดิมเสมอ
- ขยับ pointer เกิน 6px ถึงนับเป็น drag; ต่ำกว่านั้น = click เปิด modal เดิม
- ย้ายสำเร็จ = เงียบ (ไม่มี toast); error = toast + คืนสภาพ; swap = confirm ผ่าน `showScheduleConfirm` เดิม
- animate เฉพาะ `transform`/`opacity` เท่านั้น ห้าม `transition-all`; `prefers-reduced-motion: reduce` → crossfade ≤150ms
- `touch-action: none` เฉพาะ `.schedule-editor-slot` — ห้ามใส่ที่ตาราง (scroll ต้องยังทำได้)
- ไม่แก้ index.html; ไม่เพิ่ม dependency; ไม่แกะ flow save-all / dirty guards เดิม
- ห้ามยิง `saveClassSchedule` ใส่ live GAS ระหว่างทดสอบ (drag แก้ local state เท่านั้น — ปลอดภัยอยู่แล้ว)

## Review Focus

1. **Legacy rows ซ้อนเวลา (ข้อมูลเก่า intersect กันอยู่แล้ว)** — drop ต้องตรวจ overlap ซ้ำก่อนย้าย; ชน = toast + ไม่เปลี่ยนข้อมูล → Task 3 test
2. **แตะเร็ว/แตะสั้นบนมือถือ** — ต้องเป็น click เปิด modal ไม่ใช่เริ่ม drag → Task 6 test
3. **Drag ตอน filter ทีละวัน** — ย้ายภายในวันเดียวทำงาน, ไม่มี crash เมื่อคอลัมน์เดียว; ข้ามวันต้องกด "ทั้งสัปดาห์" ก่อน → Task 6 test
4. **Cell ที่มีหลายการ์ด (legacy ซ้ำ period)** — swap กับการ์ดแรก, การ์ดอื่นใน cell ค้างเดิม → Task 4 test
5. **บันทึกทั้งหมดหลังย้าย** — payload `rows` ต้องสะท้อน day/time ใหม่, ห้องอื่นไม่ถูกแตะ (behavior เดิม) → Task 6 test (ดู request payload ผ่าน route mock)

---

### Task 1: data attributes บน td.se-cell

**Files:**
- Modify: `js/app.js` ~L10093-10113 (`renderScheduleGrid()` — filled-cell branch และ empty-cell branch)

**Interfaces:**
- Produces: `td.se-cell` ทุกใบมี `data-se-day` / `data-se-start` / `data-se-end` (ค่าเดียวกับ div การ์ดด้านใน) — Task 2 ใช้ hit-test

- [ ] **Step 1: แก้ render** — เติม attrs ลง `<td class="se-cell ...">` ทั้งสอง branch (filled L10093, empty L10106) ด้วยค่าเดียวกับ `data-se-*` ของการ์ด/ปุ่มภายใน

- [ ] **Step 2: Verify (playwright-cli)** — เปิด admin editor ห้องที่มีคาบ:
  `document.querySelectorAll('td.se-cell[data-se-day]').length` > 0 และทั้ง `td.se-filled` กับ `td.se-empty` มีครบ 3 attrs

- [ ] **Step 3: Commit** — `feat(schedule): expose cell coordinates as data attributes for drop targeting`

### Task 2: Drag skeleton — threshold, ghost, hint, cancel

**Files:**
- Modify: `js/app.js` block scheduleEditor (แทรกหลัง `bindScheduleGridEvents()` L10159, ก่อน `openClassSlotModal`)
- Modify: `js/app.js` block scope (บนสุด ~L9862): `let seDragJustEnded = false;` + hoist `toMin()` จาก `saveClassSlot` (L10247) ออกมาใช้ร่วม

**Interfaces:**
- Consumes: `td.se-cell[data-se-*]` (Task 1), `window.__classScheduleState`
- Produces: `bindScheduleDragEvents()` (no args, guard `container.dataset.seDndBound`), block-scope `let dragCtx = null` ({row, ghost, startX, startY, pointerId, active}), `seDragJustEnded` flag — click delegation ที่ L10145 เช็ค+เคลียร์ก่อน `openClassSlotModal`
- Produces: `seRowAt(day, start, end)` → row แรกใน `state.rows` ของห้องที่เลือกที่ตรง day+start+end เป๊ะ — Task 3/4 ใช้

- [ ] **Step 1: แก้ click delegation** (L10145): `if (seDragJustEnded) { seDragJustEnded = false; return; }` ก่อนเรียก `openClassSlotModal`
- [ ] **Step 2: Implement `bindScheduleDragEvents()`** — pointerdown บน `.schedule-editor-slot` (setPointerCapture, เก็บ start point), pointermove เกิน 6px → `active`: สร้าง ghost (cloneNode, `se-drag-ghost`, width ตาม card rect, pointer-events:none), การ์ดต้นทาง `.se-dragging`, pointermove ต่อ: ghost ตาม pointer + `elementFromPoint().closest('td.se-cell')` → toggle `.se-drop-hover` เฉพาะ cell ล่าสุด; pointerup/pointercancel/Escape → cleanup คืนสภาพ, ถ้า active → `seDragJustEnded = true`; **ยังไม่ mutate state** (drop = แค่ยกเลิกเงียบ ๆ)
- [ ] **Step 3: Verify** — playwright: mouse down การ์ด → move 40px: `.se-drag-ghost` มีอยู่, การ์ดมี `.se-dragging`, hover cell มี `.se-drop-hover`; move 3px แล้วปล่อย: modal `#classSlotModal` เปิด (click ยังทำงาน); move 40px ปล่อยนอก grid: `state.rows` ยาวเท่าเดิม, `isDirty` false, ghost หาย
- [ ] **Step 4: Commit** — `feat(schedule): drag skeleton with ghost, drop hints and cancel paths`

### Task 3: Move-to-empty + overlap re-check + dirty + a11y

**Files:**
- Modify: `js/app.js` drag module (จาก Task 2) — pointerup branch เมื่อ target เป็น cell ว่าง

**Interfaces:**
- Consumes: `dragCtx.row`, `seRowAt()`, `toMin()` (hoisted), `setScheduleEditorDirty()`, `renderScheduleGrid()`
- Produces: `moveClassSlot(row, day, start, end)` — false ถ้า overlap (ไม่ mutate), true ถ้าสำเร็จ (mutate + dirty + render); live region `<span id="seDragLive" class="visually-hidden" aria-live="polite">` สร้างครั้งเดียว append ที่ `#classScheduleGridContainer`

- [ ] **Step 1: Implement** — drop บน cell ที่ไม่มี `.schedule-editor-slot`: ตรวจ `state.rows` ห้องเดียวกัน+วันเดียวกัน (ตัด row ตัวเอง) `toMin(r.startTime) < newEnd && newStart < toMin(r.endTime)` → ชน: `showNotification` toast + return false; ว่าง: แก้ `row.day/startTime/endTime`, `setScheduleEditorDirty(true)`, `renderScheduleGrid()`, การ์ดใหม่ใน cell เป้าหมายได้ `.se-settle`, `seDragLive.textContent = 'ย้าย <วิชา> ไป <วัน> <start>-<end>'`
- [ ] **Step 2: Verify** — drag การ์ด จันทร์ 08:30 → อังคาร 08:30 ช่องว่าง: row เปลี่ยน day ใน `state.rows`, `isDirty` true, badge "ยังไม่ได้บันทึก" โชว์, **ไม่มี toast ใหม่**, aria-live มีข้อความ; (legacy overlap จำลองโดย evaluate แทรก row ทับเวลา → drop ชน → toast + rows ไม่เปลี่ยน)
- [ ] **Step 3: Commit** — `feat(schedule): drop on empty cell moves the slot and flags dirty`

### Task 4: Swap on occupied + confirm

**Files:**
- Modify: `js/app.js` drag module — pointerup branch เมื่อ target cell มี `.schedule-editor-slot`

**Interfaces:**
- Consumes: `seRowAt()`, `showScheduleConfirm()` (เดิม L9884), `moveClassSlot()` logic
- Produces: `swapClassSlots(rowA, rowB)` — แลกกันแบบ destructure `[{day,startTime,endTime}, {day:..., startTime:..., endTime:...}] = [b, a]` แล้ว dirty + render + aria; คืน true

- [ ] **Step 1: Implement** — drop ทับการ์ด: `showScheduleConfirm({ title:'สลับคาบเรียน', body: 'ย้าย "A" ไป <วัน/เวลา> และ "B" มาแทน — ตกลง?', okText:'สลับ', danger:false })` → ปฏิเสธ = ไม่เปลี่ยน; ยอมรับ = `swapClassSlots`; cell เป้าหมายมีหลายการ์ด → เลือกการ์ดแรก
- [ ] **Step 2: Verify** — drag การ์ด A ทับ B: modal confirm โชว์ → Cancel: rows เดิมทุก field; → OK: day/start/end แลกกัน, `validFrom/validTo` ของแต่ละวิชา **ค้างเดิม**, isDirty true; cell 3 การ์ด → swap เฉพาะกับการ์ดแรก
- [ ] **Step 3: Commit** — `feat(schedule): drop on occupied cell swaps slots behind a confirm`

### Task 5: CSS — ghost, hints, settle, reduced-motion

**Files:**
- Modify: `css/style.css` (ท้าย block `.se-*` / `.schedule-editor-*` ~L7865)

- [ ] **Step 1: Implement** — `.schedule-editor-slot { cursor: grab; touch-action: none; }` (`@media (hover:hover)`), `.se-dragging { opacity:.35 }`, `.se-drag-ghost { position:fixed; z-index:3000; pointer-events:none; opacity:.5; box-shadow… }`, `.se-drop-hover { outline:2px dashed #667EEA; outline-offset:-2px; background:#EDEBFB }`, `.se-settle { animation: se-settle .18s ease-out }` `@keyframes se-settle { from { transform: scale(.98) } }`, `@media (prefers-reduced-motion: reduce)`: ghost/settle เหลือ opacity transition 120ms, ไม่มี transform; `#seDragLive` ซ่อนด้วย pattern `.visually-hidden` (ตรวจว่ามี class นี้ใน Bootstrap 5 อยู่แล้ว — มี)
- [ ] **Step 2: Verify** — computed style การ์ด = `touch-action: none`; emulate reduced-motion → ghost ไม่มี transform transition; viewport 320/393px เปิด editor ไม่มี horizontal scroll เพิ่ม
- [ ] **Step 3: Commit** — `feat(schedule): drag ghost, drop hint and settle styling per design spec`

### Task 6: Regression + mobile + save payload + ปิดงาน

**Files:**
- Modify: none (verification-only task) — แก้จุดบกพร่องที่พบหากมี

- [ ] **Step 1: Touch + click regression (viewport 393px)** — touchscreen tap การ์ดเร็ว: modal เปิด; touch drag ยาว: ย้ายได้; filter "ทีละวัน" → ลากภายในคอลัมน์เดียวได้, ไม่ crash
- [ ] **Step 2: Save payload** — route-mock `/api/gas` (ไม่ยิง live): ย้าย 1 การ์ด → กด "บันทึกทั้งหมด" → confirm → payload `rows` มี day/time ใหม่ + `roomId` ถูกต้อง
- [ ] **Step 3: ปิดงาน** — `graft build`; commit ค้าง (footer V1.5 ใน index.html): `feat(schedule): drag-and-drop move/swap slots + footer V1.5`; อัพเดต HANDOFF.md ส่วน B ถ้าจำเป็น (grid interactions มี drag แล้ว)
