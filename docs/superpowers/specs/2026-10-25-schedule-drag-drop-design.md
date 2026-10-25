# Design: ลากวางจัดตารางสอน (Schedule Drag & Drop)

**Date:** 2026-10-25 · **Status:** approved · **Size:** small-to-medium (1 JS module + CSS, no deps)

## Intent & Why

ผู้ดูแลจัดตารางสอนในหน้าเว็บได้เลย โดยลากการ์ดคาบเรียนไปวางวัน/เวลาอื่น — เร็วกว่าเปิด modal ทีละคาบเมื่อต้องสลับตารางหลายช่อง ทำงานร่วมกับ flow เดิม (modal, บันทึกทั้งหมด, dirty badge) ไม่ทดแทน

## Goals

- ลากการ์ดคาบเรียน (`.schedule-editor-slot`) ย้ายระหว่างช่อง (วัน × คาบเวลา) ใน **ห้องเดียวกัน**
- วางบนช่องว่าง = ย้าย; วางบนช่องที่มีคาบ = **สลับตำแหน่ง + confirm ก่อนสลับ**
- เมาส์ + นิ้วมือถือ (Pointer Events)
- ทุกการลากวาง = แก้ในหน้าจอ + `isDirty` → ผู้ใช้กด "บันทึกทั้งหมด" ตามระบบเดิม (saveClassSchedule per-room, LockService)

## Non-goals

- ถาดคลังวิชา (ลากวิชาใหม่จากรายชื่อ) — รอ feedback ใช้งานจริง
- ลากข้ามห้อง (grid แสดงห้องเดียว: แถว = เวลา, คอลัมน์ = วัน)
- auto-save ต่อการ์ด, arrow-key reorder (keyboard ใช้ modal เดิมซึ่ง keyboard-operable อยู่แล้ว)

## Approaches พิจารณา

| แนวทาง | ตัดสิน |
|---|---|
| **A. Pointer Events เขียนเอง** (~180 บรรทัด ใน block scheduleEditor เดิม) | **เลือก** — ไม่เพิ่ม dependency, คุม ghost/indicator/ธีมได้ทั้งหมด, คุม click-vs-drag threshold เอง |
| B. SortableJS (CDN ~50KB, มี swap plugin) | ตัด — ghost เป็นสไตล์ library ต้อง override, ออกแบบมาสำหรับ list ไม่ใช่ตาราง `td` + placeholder |
| C. แตะเลือก-แตะวาง | ตัด — ไม่ใช่ drag ตามที่ผู้ใช้ขอ |

## Constraints (จากโค้ดเดิม)

- Grid re-render ทั้งก้อนทุกครั้ง (`renderScheduleGrid()` → `container.innerHTML`) — drag code ต้องเป็น **delegation บน `#classScheduleGrid`** ที่ผูกครั้งเดียว
- Click การ์ด = เปิด `#classSlotModal` (edit) / ช่องว่าง = add — ต้องไม่พัง: ขยับเกิน ~6px ถึงนับเป็น drag; ปล่อยก่อนนั้น = click ปกติ, และ suppress click หนึ่งครั้งหลัง drag จบ
- `validFrom/validTo` เป็นคุณสมบัติของวิชา — การย้าย/สลับแก้เฉพาะ `day/startTime/endTime`
- Overlap ภายในห้อง+วัน ตรวจด้วย `toMin()` interval-intersection — ต้องตรวจซ้ำตอน drop (กันข้อมูลเก่าที่ซ้อนเวลาอยู่แล้ว)

## UX Spec (hallmark: microinteractions + 8 states)

| สถานะ | การแสดง |
|---|---|
| Default | การ์ดปกติ, `cursor: grab` บน hover (`@media (hover:hover)`) |
| Dragging | ghost = clone โปร่ง 50% ลอย fixed ตาม pointer, การ์ดต้นทาง `.se-dragging` opacity .35 |
| Drop-hover | ช่องเป้าหมายขอบเส้นประสีธีม `#667EEA` + พื้น `#EDEBFB` (สีเดียวกับ header ตาราง) |
| Success (ย้าย) | **เงียบ** — การ์ดอยู่ในช่องใหม่ให้เห็นแล้ว + spring settle สั้น (transform ค้าง scale .98→1), ไม่มี toast |
| Success (สลับ) | confirm ผ่าน `#scheduleConfirmModal` เดิม → สลับแล้วเงียบเช่นกัน |
| Error (overlap) | ไม่ย้าย + toast เตือนวัน/เวลาชน + สภาพเดิมคืนอัตโนมัติ |
| Cancelled | ปล่อยนอก grid / Esc / pointercancel → คืนสภาพ ไม่เปลี่ยนข้อมูล |
| a11y | `aria-live=polite` แจ้ง "ย้าย X ไป วัน…เวลา…" / "สลับแล้ว" / "ยกเลิก"; focus ring เดิมไม่แตะ |

- Motion: เฉพาะ `transform`/`opacity`, easing `--ease-out`-เทียบเท่า, **ห้าม `transition-all`**; `prefers-reduced-motion: reduce` → ตัด ghost/settle animation เหลือ opacity crossfade ≤150ms
- Hit target: การ์ดมีอยู่แล้ว ≥44px; `touch-action: none` เฉพาะการ์ด (scroll ตารางยังทำได้จากช่องอื่น)
- หมายเหตุ: ผู้ใช้เลือก "สลับ + confirm" — ชนะ hallmark's undo-over-confirm default อย่างชัดเจน

## What's left to the builder

- ชื่อ function ภายใน, การจัด variable, จุดแทรกใน block เดิม
- Auto-scroll ตารางขณะลากใกล้ขอบ (minimal: เฉพาาะตอนลากใน `.schedule-editor-scroll`)
- จำนวนบรรทัดจริงอาจต่างจากประมาณการ
