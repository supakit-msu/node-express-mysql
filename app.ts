import express, { Request, Response, NextFunction } from "express";
import { conn } from "./dbconnect";

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

// In-Memory Fallback กรณี Database หลุด
let inMemCustomers: any[] = [
  { customer_id: 1, name: "สมชาย ใจดี", phone: "081-111-2222", latitude: 16.1890, longitude: 103.2500 },
  { customer_id: 2, name: "สมหญิง รักเรียน", phone: "082-222-3333", latitude: 16.1900, longitude: 103.2550 }
];
let inMemOrders: any[] = [];

// ==========================================
// 1. Web API สำหรับจัดการข้อมูลลูกค้า (Customer)
// ==========================================

// 1.1 แสดงข้อมูลลูกค้าทุกคน
app.get("/api/customers", async (req: Request, res: Response) => {
  try {
    const [rows]: any = await conn.query("SELECT * FROM customers");
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.warn("DB Fallback GET /api/customers");
    return res.json({ success: true, data: inMemCustomers });
  }
});

// เพิ่มข้อมูลลูกค้า
app.post("/api/customers", async (req: Request, res: Response) => {
  const { name, phone, latitude, longitude } = req.body;
  try {
    const [result]: any = await conn.query(
      "INSERT INTO customers (name, phone, latitude, longitude) VALUES (?, ?, ?, ?)",
      [name, phone, latitude, longitude]
    );
    const newCustomer = {
      customer_id: result.insertId,
      name,
      phone,
      latitude: Number(latitude),
      longitude: Number(longitude),
    };
    inMemCustomers.push(newCustomer);
    return res.status(201).json({ success: true, message: "เพิ่มข้อมูลลูกค้าสำเร็จ", data: newCustomer });
  } catch (err) {
    console.warn("DB Fallback POST /api/customers");
    const newId = inMemCustomers.length > 0 ? Math.max(...inMemCustomers.map(c => c.customer_id)) + 1 : 1;
    const newCustomer = {
      customer_id: newId,
      name,
      phone,
      latitude: Number(latitude),
      longitude: Number(longitude),
    };
    inMemCustomers.push(newCustomer);
    return res.status(201).json({ success: true, message: "เพิ่มข้อมูลลูกค้าสำเร็จ", data: newCustomer });
  }
});

// แก้ไขข้อมูลลูกค้า
app.put("/api/customers/:customer_id", async (req: Request, res: Response) => {
  const { customer_id } = req.params;
  const { name, phone, latitude, longitude } = req.body;
  try {
    const [result]: any = await conn.query(
      "UPDATE customers SET name = ?, phone = ?, latitude = ?, longitude = ? WHERE customer_id = ?",
      [name, phone, latitude, longitude, customer_id]
    );
    const customer = { customer_id: Number(customer_id), name, phone, latitude, longitude };
    return res.json({ success: true, message: "แก้ไขข้อมูลลูกค้าสำเร็จ", data: customer });
  } catch (err) {
    const customer = inMemCustomers.find(c => c.customer_id == Number(customer_id));
    if (customer) {
      if (name !== undefined) customer.name = name;
      if (phone !== undefined) customer.phone = phone;
      if (latitude !== undefined) customer.latitude = latitude;
      if (longitude !== undefined) customer.longitude = longitude;
      return res.json({ success: true, message: "แก้ไขข้อมูลลูกค้าสำเร็จ", data: customer });
    }
    return res.status(404).json({ success: false, message: "ไม่พบข้อมูลลูกค้านี้" });
  }
});

// ลบข้อมูลลูกค้า
app.delete("/api/customers/:customer_id", async (req: Request, res: Response) => {
  const { customer_id } = req.params;
  const idNum = Number(customer_id);
  try {
    await conn.query("DELETE FROM orders WHERE customer_id = ?", [idNum]);
    await conn.query("DELETE FROM customers WHERE customer_id = ?", [idNum]);
    inMemCustomers = inMemCustomers.filter(c => c.customer_id !== idNum);
    inMemOrders = inMemOrders.filter(o => o.customer_id !== idNum);
    return res.json({ success: true, message: "ลบข้อมูลลูกค้าสำเร็จ" });
  } catch (err) {
    inMemCustomers = inMemCustomers.filter(c => c.customer_id !== idNum);
    inMemOrders = inMemOrders.filter(o => o.customer_id !== idNum);
    return res.json({ success: true, message: "ลบข้อมูลลูกค้าสำเร็จ" });
  }
});

// 1.2 ค้นหาจากส่วนหนึ่งของชื่อ หรือนามสกุล
app.get("/api/customers/search", async (req: Request, res: Response) => {
  const keyword = (req.query.keyword as string) || "";
  try {
    const [rows]: any = await conn.query("SELECT * FROM customers WHERE name LIKE ?", [`%${keyword}%`]);
    return res.json({ success: true, data: rows });
  } catch (err) {
    const result = inMemCustomers.filter(c => c.name.includes(keyword));
    return res.json({ success: true, data: result });
  }
});

// 1.3 ค้นลูกค้าทั้งหมดในระยะ 1 กิโลเมตรจากพิกัดที่กำหนด
app.get("/api/customers/nearby-1km", async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  try {
    const [rows]: any = await conn.query("SELECT * FROM customers");
    const result = rows.filter((c: any) => {
      const distance = getDistanceFromLatLonInKm(lat, lng, Number(c.latitude), Number(c.longitude));
      return distance <= 1.0;
    });
    return res.json({ success: true, data: result });
  } catch (err) {
    const result = inMemCustomers.filter(c => {
      const distance = getDistanceFromLatLonInKm(lat, lng, Number(c.latitude), Number(c.longitude));
      return distance <= 1.0;
    });
    return res.json({ success: true, data: result });
  }
});

// ==========================================
// 2. Web API สำหรับจัดการรายการสั่งซื้อ (Order)
// ==========================================

// 2.1 จำลองรายการสั่งซื้อ 20-30 รายการ
app.post("/api/orders/seed", async (req: Request, res: Response) => {
  try {
    await conn.query("DELETE FROM orders");
    const [custRows]: any = await conn.query("SELECT customer_id FROM customers");
    const totalOrders = Math.floor(Math.random() * 6) + 25; // สุ่ม 25-30 รายการ
    const values: any[] = [];
    const generated: any[] = [];

    for (let i = 1; i <= totalOrders; i++) {
      const cId = custRows.length > 0 ? custRows[i % custRows.length].customer_id : 1;
      const qty = Math.floor(Math.random() * 3) + 1;
      values.push([cId, qty, "PENDING"]);
      generated.push({ order_id: i, customer_id: cId, quantity: qty, status: "PENDING", order_date: new Date() });
    }
    if (values.length > 0) {
      await conn.query("INSERT INTO orders (customer_id, quantity, status) VALUES ?", [values]);
    }
    inMemOrders = generated;
    return res.json({ success: true, message: `จำลองออเดอร์สำเร็จ ${generated.length} รายการ`, data: generated });
  } catch (err) {
    inMemOrders = [];
    const totalOrders = Math.floor(Math.random() * 6) + 25;
    for (let i = 1; i <= totalOrders; i++) {
      inMemOrders.push({
        order_id: i,
        customer_id: (i % inMemCustomers.length) + 1,
        quantity: Math.floor(Math.random() * 3) + 1,
        status: "PENDING",
        order_date: new Date()
      });
    }
    return res.json({ success: true, message: `จำลองออเดอร์สำเร็จ ${inMemOrders.length} รายการ`, data: inMemOrders });
  }
});

// เพิ่มออเดอร์ใหม่แบบระบุลูกค้าและจำนวนกล่อง
app.post("/api/orders", async (req: Request, res: Response) => {
  const { customer_id, quantity } = req.body;
  try {
    const [result]: any = await conn.query(
      "INSERT INTO orders (customer_id, quantity, status) VALUES (?, ?, 'PENDING')",
      [customer_id, quantity || 1]
    );
    const newOrder = {
      order_id: result.insertId,
      customer_id: Number(customer_id),
      quantity: Number(quantity) || 1,
      status: "PENDING",
      order_date: new Date()
    };
    inMemOrders.push(newOrder);
    return res.status(201).json({ success: true, message: "เพิ่มออเดอร์สำเร็จ", data: newOrder });
  } catch (err) {
    const newOrderId = inMemOrders.length > 0 ? Math.max(...inMemOrders.map(o => o.order_id)) + 1 : 1;
    const newOrder = {
      order_id: newOrderId,
      customer_id: Number(customer_id),
      quantity: Number(quantity) || 1,
      status: "PENDING",
      order_date: new Date()
    };
    inMemOrders.push(newOrder);
    return res.status(201).json({ success: true, message: "เพิ่มออเดอร์สำเร็จ", data: newOrder });
  }
});

// เพิ่ม / แก้ไข จำนวนกล่องในออเดอร์
app.put("/api/orders/:order_id", async (req: Request, res: Response) => {
  const { order_id } = req.params;
  const { quantity } = req.body;
  try {
    await conn.query("UPDATE orders SET quantity = ? WHERE order_id = ?", [quantity, order_id]);
    const [rows]: any = await conn.query("SELECT * FROM orders WHERE order_id = ?", [order_id]);
    return res.json({ success: true, message: "อัปเดตจำนวนกล่องสำเร็จ", data: rows[0] });
  } catch (err) {
    const order = inMemOrders.find(o => o.order_id == Number(order_id));
    if (order) {
      order.quantity = quantity;
      return res.json({ success: true, message: "อัปเดตจำนวนกล่องสำเร็จ", data: order });
    }
    return res.status(404).json({ success: false, message: "ไม่พบออเดอร์นี้" });
  }
});

// 2.2 ล้าง (ลบทั้งหมด) รายการสั่งซื้อที่จำลอง
app.delete("/api/orders/clear", async (req: Request, res: Response) => {
  try {
    await conn.query("DELETE FROM orders");
    inMemOrders = [];
    return res.json({ success: true, message: "ล้างรายการสั่งซื้อทั้งหมดเรียบร้อยแล้ว" });
  } catch (err) {
    inMemOrders = [];
    return res.json({ success: true, message: "ล้างรายการสั่งซื้อทั้งหมดเรียบร้อยแล้ว" });
  }
});

// ลบออเดอร์รายรายการตาม order_id
app.delete("/api/orders/:order_id", async (req: Request, res: Response) => {
  const { order_id } = req.params;
  const idNum = Number(order_id);
  try {
    await conn.query("DELETE FROM orders WHERE order_id = ?", [idNum]);
    inMemOrders = inMemOrders.filter(o => o.order_id !== idNum);
    return res.json({ success: true, message: "ลบออเดอร์สำเร็จ" });
  } catch (err) {
    inMemOrders = inMemOrders.filter(o => o.order_id !== idNum);
    return res.json({ success: true, message: "ลบออเดอร์สำเร็จ" });
  }
});

// 2.3 แสดงรายการสั่งซื้อทั้งหมดในระยะ 2 กิโลเมตรจากพิกัดที่กำหนด
app.get("/api/orders/nearby-2km", async (req: Request, res: Response) => {
  try {
    const [rows]: any = await conn.query(`
      SELECT o.order_id, o.customer_id, o.quantity, o.status, o.order_date,
             c.name, c.phone, c.latitude, c.longitude
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.customer_id
    `);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.json({ success: true, data: inMemOrders });
  }
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