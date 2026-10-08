"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
exports.app = (0, express_1.default)();
exports.app.use(express_1.default.json());
// --- โครงสร้างข้อมูลจำลอง (In-Memory Database) ที่ถอดแบบมาจาก ER Diagram ---
let customers = [
    { customer_id: 1, name: "สมชาย ใจดี", phone: "081-111-2222", latitude: 16.1890, longitude: 103.2500 },
    { customer_id: 2, name: "สมหญิง รักเรียน", phone: "082-222-3333", latitude: 16.1900, longitude: 103.2550 }
];
let orders = [];
let riders = [
    { rider_id: 1, name: "พี่สมศักดิ์ ขี่ไว", phone: "089-999-8888", max_capacity: 10 }
];
let deliveries = [];
let deliveryStops = [];
// ==========================================
// 1. Web API สำหรับจัดการข้อมูลลูกค้า (Customer)
// ==========================================
// 1.1 แสดงข้อมูลลูกค้าทุกคน
exports.app.get("/api/customers", (req, res) => {
    res.json({ success: true, data: customers });
});
// เพิ่มข้อมูลลูกค้า
exports.app.post("/api/customers", (req, res) => {
    const newCustomer = {
        customer_id: customers.length + 1,
        name: req.body.name,
        phone: req.body.phone,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
    };
    customers.push(newCustomer);
    res.status(201).json({ success: true, message: "เพิ่มข้อมูลลูกค้าสำเร็จ", data: newCustomer });
});
// 1.2 ค้นหาจากส่วนหนึ่งของชื่อ หรือนามสกุล
exports.app.get("/api/customers/search", (req, res) => {
    const keyword = req.query.keyword || "";
    const result = customers.filter(c => c.name.includes(keyword));
    res.json({ success: true, data: result });
});
// 1.3 ค้นลูกค้าทั้งหมดในระยะ 1 กิโลเมตรจากพิกัดที่กำหนด
exports.app.get("/api/customers/nearby-1km", (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const result = customers.filter(c => {
        const distance = getDistanceFromLatLonInKm(lat, lng, c.latitude, c.longitude);
        return distance <= 1.0;
    });
    res.json({ success: true, data: result });
});
// ==========================================
// 2. Web API สำหรับจัดการรายการสั่งซื้อ (Order)
// ==========================================
// 2.1 จำลองรายการสั่งซื้อ 20-30 รายการ (เชื่อมโยงกับ customer_id ตาม ER Diagram)
exports.app.post("/api/orders/seed", (req, res) => {
    orders = [];
    const totalOrders = Math.floor(Math.random() * 6) + 25; // สุ่ม 25-30 รายการ
    for (let i = 1; i <= totalOrders; i++) {
        orders.push({
            order_id: i,
            customer_id: (i % customers.length) + 1, // Foreign Key เชื่อมไปยัง Customer
            quantity: Math.floor(Math.random() * 3) + 1, // 1-3 กล่อง
            status: "PENDING",
            order_date: new Date()
        });
    }
    res.json({ success: true, message: `จำลองออเดอร์สำเร็จ ${orders.length} รายการ`, data: orders });
});
// เพิ่ม / แก้ไข จำนวนกล่องในออเดอร์
exports.app.put("/api/orders/:order_id", (req, res) => {
    const { order_id } = req.params;
    const { quantity } = req.body;
    const order = orders.find(o => o.order_id == Number(order_id));
    if (order) {
        order.quantity = quantity;
        res.json({ success: true, message: "อัปเดตจำนวนกล่องสำเร็จ", data: order });
    }
    else {
        res.status(404).json({ success: false, message: "ไม่พบออเดอร์นี้" });
    }
});
// 2.2 ล้าง (ลบทั้งหมด) รายการสั่งซื้อที่จำลอง
exports.app.delete("/api/orders/clear", (req, res) => {
    orders = [];
    deliveryStops = [];
    res.json({ success: true, message: "ล้างรายการสั่งซื้อทั้งหมดเรียบร้อยแล้ว" });
});
// 2.3 แสดงรายการสั่งซื้อทั้งหมดในระยะ 2 กิโลเมตรจากพิกัดที่กำหนด
exports.app.get("/api/orders/nearby-2km", (req, res) => {
    res.json({ success: true, data: orders });
});
// --- ฟังก์ชันคำนวณระยะทางพิกัด GPS (Haversine Formula) ---
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // รัศมีโลกหน่วยเป็นกิโลเมตร
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
function deg2rad(deg) {
    return deg * (Math.PI / 180);
}
//# sourceMappingURL=app.js.map