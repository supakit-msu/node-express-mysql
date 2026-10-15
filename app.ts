import express, { Request, Response, NextFunction } from "express";

export const app = express();

// Middleware จัดการ CORS สำหรับทุก Request
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// --- โครงสร้างข้อมูลจำลอง (In-Memory Database) ที่ถอดแบบมาจาก ER Diagram ---

let customers: any[] = [
  { customer_id: 1, name: "สมชาย ใจดี", phone: "081-111-2222", latitude: 16.1890, longitude: 103.2500 },
  { customer_id: 2, name: "สมหญิง รักเรียน", phone: "082-222-3333", latitude: 16.1900, longitude: 103.2550 }
];

let orders: any[] = [];
let riders: any[] = [
  { rider_id: 1, name: "พี่สมศักดิ์ ขี่ไว", phone: "089-999-8888", max_capacity: 10 }
];
let deliveries: any[] = [];
let deliveryStops: any[] = [];


// ==========================================
// 1. Web API สำหรับจัดการข้อมูลลูกค้า (Customer)
// ==========================================

// 1.1 แสดงข้อมูลลูกค้าทุกคน
app.get("/api/customers", (req: Request, res: Response) => {
  res.json({ success: true, data: customers });
});

// เพิ่มข้อมูลลูกค้า
app.post("/api/customers", (req: Request, res: Response) => {
  const newId = customers.length > 0 ? Math.max(...customers.map(c => c.customer_id)) + 1 : 1;
  const newCustomer = {
    customer_id: newId,
    name: req.body.name,
    phone: req.body.phone,
    latitude: req.body.latitude,
    longitude: req.body.longitude,
  };
  customers.push(newCustomer);
  res.status(201).json({ success: true, message: "เพิ่มข้อมูลลูกค้าสำเร็จ", data: newCustomer });
});

// แก้ไขข้อมูลลูกค้า
app.put("/api/customers/:customer_id", (req: Request, res: Response) => {
  const { customer_id } = req.params;
  const { name, phone, latitude, longitude } = req.body;
  const customer = customers.find(c => c.customer_id == Number(customer_id));

  if (customer) {
    if (name !== undefined) customer.name = name;
    if (phone !== undefined) customer.phone = phone;
    if (latitude !== undefined) customer.latitude = latitude;
    if (longitude !== undefined) customer.longitude = longitude;
    res.json({ success: true, message: "แก้ไขข้อมูลลูกค้าสำเร็จ", data: customer });
  } else {
    res.status(404).json({ success: false, message: "ไม่พบข้อมูลลูกค้านี้" });
  }
});

// ลบข้อมูลลูกค้า
app.delete("/api/customers/:customer_id", (req: Request, res: Response) => {
  const { customer_id } = req.params;
  const idNum = Number(customer_id);
  const index = customers.findIndex(c => c.customer_id === idNum);

  if (index !== -1) {
    customers.splice(index, 1);
    // ลบออเดอร์ของลูกค้ารายนี้ด้วย
    orders = orders.filter(o => o.customer_id !== idNum);
    res.json({ success: true, message: "ลบข้อมูลลูกค้าสำเร็จ" });
  } else {
    res.status(404).json({ success: false, message: "ไม่พบข้อมูลลูกค้านี้" });
  }
});

// 1.2 ค้นหาจากส่วนหนึ่งของชื่อ หรือนามสกุล
app.get("/api/customers/search", (req: Request, res: Response) => {
  const keyword = (req.query.keyword as string) || "";
  const result = customers.filter(c => c.name.includes(keyword));
  res.json({ success: true, data: result });
});

// 1.3 ค้นลูกค้าทั้งหมดในระยะ 1 กิโลเมตรจากพิกัดที่กำหนด
app.get("/api/customers/nearby-1km", (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);

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
app.post("/api/orders/seed", (req: Request, res: Response) => {
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
app.put("/api/orders/:order_id", (req: Request, res: Response) => {
  const { order_id } = req.params;
  const { quantity } = req.body;
  const order = orders.find(o => o.order_id == Number(order_id));
  
  if (order) {
    order.quantity = quantity;
    res.json({ success: true, message: "อัปเดตจำนวนกล่องสำเร็จ", data: order });
  } else {
    res.status(404).json({ success: false, message: "ไม่พบออเดอร์นี้" });
  }
});

// 2.2 ล้าง (ลบทั้งหมด) รายการสั่งซื้อที่จำลอง
app.delete("/api/orders/clear", (req: Request, res: Response) => {
  orders = [];
  deliveryStops = [];
  res.json({ success: true, message: "ล้างรายการสั่งซื้อทั้งหมดเรียบร้อยแล้ว" });
});

// 2.3 แสดงรายการสั่งซื้อทั้งหมดในระยะ 2 กิโลเมตรจากพิกัดที่กำหนด
app.get("/api/orders/nearby-2km", (req: Request, res: Response) => {
  res.json({ success: true, data: orders });
});


// --- ฟังก์ชันคำนวณระยะทางพิกัด GPS (Haversine Formula) ---
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // รัศมีโลกหน่วยเป็นกิโลเมตร
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}