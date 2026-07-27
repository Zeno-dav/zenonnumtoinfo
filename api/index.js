import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const { num, Key } = req.query;

  // 1. API Key Check (Missing Key)
  if (!Key) {
    return res.status(401).json({ 
      success: false, 
      message: "API key missing! To BUY this API, message on WhatsApp: +63 962 065 8587 or Telegram: @Zeno098",
      buy_contact: "WhatsApp: +63 962 065 8587",
      telegram: "@Zeno098",
      developer: "@Zeno098"
    });
  }

  // 2. Load Keys Database
  const dbPath = path.join(process.cwd(), 'keys.json');
  let keysData = {};
  
  if (fs.existsSync(dbPath)) {
    keysData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  }

  // 3. Validate API Key (Invalid Key)
  const userRecord = keysData[Key];
  if (!userRecord) {
    return res.status(403).json({ 
      success: false, 
      message: "Invalid API key! To BUY a valid API, message on WhatsApp: +63 962 065 8587 or Telegram: @Zeno098",
      buy_contact: "WhatsApp: +63 962 065 8587",
      telegram: "@Zeno098",
      developer: "@Zeno098"
    });
  }

  // 4. AUTOMATIC EXPIRY DATE CALCULATION (Expired Key)
  const startDate = new Date(userRecord.startDate);
  const expiryDate = new Date(startDate);
  expiryDate.setDate(expiryDate.getDate() + userRecord.days); 

  const currentTime = new Date();
  if (currentTime > expiryDate) {
    return res.status(403).json({ 
      success: false, 
      message: `This API expired on ${expiryDate.toDateString()}! To RENEW or BUY, message on WhatsApp: +63 962 065 8587 or Telegram: @Zeno098`,
      buy_contact: "WhatsApp: +63 962 065 8587",
      telegram: "@Zeno098",
      developer: "@Zeno098"
    });
  }

  // 5. Check num parameter
  if (!num) {
    return res.status(400).json({ 
      success: false, 
      message: "num parameter missing. Please provide a valid number." 
    });
  }

  try {
    // 6. Upstream API se Data Fetch Karna
    const response = await fetch(
      `https://hitech-info-noobster.com-dashbord63hh7qe4.workers.dev/search?mobile=${encodeURIComponent(num)}`
    );

    if (!response.ok) {
      return res.status(response.status).json({ success: false, message: "Upstream API error" });
    }

    const upstreamData = await response.json();

    // 7. Data Extractor Logic
    let extractedRecord = {};
    if (upstreamData.data && Array.isArray(upstreamData.data) && upstreamData.data.length > 0) {
      extractedRecord = upstreamData.data[0]; 
    } else if (Array.isArray(upstreamData) && upstreamData.length > 0) {
      extractedRecord = upstreamData[0];
    } else {
      extractedRecord = upstreamData;
    }

    // 8. Ekdum Clean aur Normal JSON format (With 'bought_from')
    const cleanResponse = {
      status: true,
      message: "Data fetched successfully",
      api_user: userRecord.name, 
      number: num,
      details: {
        name: extractedRecord.name || "Not Found",
        fatherName: extractedRecord.fname || "Not Found",
        address: extractedRecord.address || "Not Found",
        circle: extractedRecord.circle || "Not Found",
        alternateNumber: extractedRecord.alternate || "Not Found",
        aadhaar: extractedRecord.id || "Not Found" 
      },
      developer: "@Zeno098",
      bought_from: "WhatsApp: +63 962 065 8587 | Telegram: @Zeno098", // Yahan show hoga kahan se buy kiya hai
      notice: "This API is exclusively for active users.",
      buy_more: "To buy more APIs, message on WhatsApp: +63 962 065 8587 or Telegram: @Zeno098"
    };

    // 9. Return Formatted (Pretty) JSON
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).send(JSON.stringify(cleanResponse, null, 2));

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
