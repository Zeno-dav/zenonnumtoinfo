import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const { num, apiKey } = req.query;

  // 1. API Key Check
  if (!apiKey) {
    return res.status(401).json({ 
      success: false, 
      message: "API key missing. This API is exclusively for active users. To buy, message on WhatsApp: +63 962 065 8587 (Serious buyers only: Just sending 'hello' will not get a reply).",
      developer: "@developer_NovaG"
    });
  }

  // 2. Load Keys Database
  const dbPath = path.join(process.cwd(), 'keys.json');
  let keysData = {};
  
  if (fs.existsSync(dbPath)) {
    keysData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  }

  // 3. Validate API Key
  const userRecord = keysData[apiKey];
  if (!userRecord) {
    return res.status(403).json({ 
      success: false, 
      message: "Invalid API key. This API is exclusively for active users.",
      developer: "@developer_NovaG"
    });
  }

  // 4. AUTOMATIC EXPIRY DATE CALCULATION
  const startDate = new Date(userRecord.startDate);
  const expiryDate = new Date(startDate);
  expiryDate.setDate(expiryDate.getDate() + userRecord.days); // Start date mein days jod diye

  const currentTime = new Date();
  if (currentTime > expiryDate) {
    return res.status(403).json({ 
      success: false, 
      message: `This API was expired on ${expiryDate.toDateString()}`,
      developer: "@developer_NovaG",
      contact: "To buy, message on WhatsApp: +63 962 065 8587"
    });
  }

  // 5. Check num parameter
  if (!num) {
    return res.status(400).json({ 
      success: false, 
      message: "num parameter missing" 
    });
  }

  try {
    // 6. Upstream API se Data Fetch Karna
    const response = await fetch(
      `https://free-api-anuragsingh.vercel.app/api/number?num=${encodeURIComponent(num)}`
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

    // 8. Ekdum Clean aur Normal JSON format (With User Name)
    const cleanResponse = {
      status: true,
      message: "Data fetched successfully",
      api_user: userRecord.name, // <--- YAHAN USER KA NAAM AAYEGA
      number: num,
      details: {
        name: extractedRecord.name || "Not Found",
        fatherName: extractedRecord.fname || "Not Found",
        address: extractedRecord.address || "Not Found",
        circle: extractedRecord.circle || "Not Found",
        alternateNumber: extractedRecord.alternate || "Not Found",
        aadhaar: extractedRecord.id || "Not Found" // ID mapping fixed
      },
      developer: "@zeno098",
      notice: "This API is exclusively for active users.",
      contact: "To buy this API, message on WhatsApp: +63 962 065 8587 (Serious buyers only)"
    };

    // 9. Return Formatted (Pretty) JSON taaki ek line mein na aaye
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).send(JSON.stringify(cleanResponse, null, 2));

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
