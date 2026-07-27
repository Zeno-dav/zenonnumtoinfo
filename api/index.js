import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const { num, apiKey } = req.query;

  // 1. API Key Check (Agar key na di ho)
  if (!apiKey) {
    return res.status(401).json({ 
      success: false, 
      message: "API key missing. This API is exclusively for active users. To buy, message on WhatsApp: +63 962 065 8587 (Serious buyers only: Just sending 'hello' will not get a reply, state your requirement directly).",
      developer: "@developer_NovaG"
    });
  }

  // 2. Load Keys Database
  const dbPath = path.join(process.cwd(), 'keys.json');
  let keysData = {};
  
  if (fs.existsSync(dbPath)) {
    keysData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  }

  // 3. Validate API Key (Agar key galat ho)
  const userRecord = keysData[apiKey];
  if (!userRecord) {
    return res.status(403).json({ 
      success: false, 
      message: "Invalid API key. This API is exclusively for active users.",
      developer: "@developer_NovaG"
    });
  }

  // 4. Check Expiry (Agar key ka time khatam ho gaya ho)
  const currentTime = new Date();
  if (currentTime > new Date(userRecord.expiryDate)) {
    return res.status(403).json({ 
      success: false, 
      message: "This API was expired",
      developer: "@developer_NovaG",
      contact: "To buy, message on WhatsApp: +63 962 065 8587"
    });
  }

  // 5. Check num parameter (Agar number na diya ho)
  if (!num) {
    return res.status(400).json({ 
      success: false, 
      message: "num parameter missing" 
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

    // 7. Data Extractor Logic (Ajeeb format ko normal mein badalna)
    let extractedRecord = {};
    
    // Agar data 'data' naam ke array ke andar hai
    if (upstreamData.data && Array.isArray(upstreamData.data) && upstreamData.data.length > 0) {
      extractedRecord = upstreamData.data[0]; 
    } 
    // Agar seedha array hai
    else if (Array.isArray(upstreamData) && upstreamData.length > 0) {
      extractedRecord = upstreamData[0];
    }
    // Agar direct object hai
    else {
      extractedRecord = upstreamData;
    }

    // 8. Ekdum Clean aur Normal JSON format banana
    const cleanResponse = {
      status: true,
      message: "Data fetched successfully",
      number: num,
      details: {
        name: extractedRecord.name || "Not Found",
        fatherName: extractedRecord.fname || "Not Found",
        address: extractedRecord.address || "Not Found",
        circle: extractedRecord.circle || "Not Found",
        alternateNumber: extractedRecord.alternate || "Not Found",
        aadhaar: extractedRecord.id || "Not Found"
      },
      // Zeno Branding & Contact Info (Bottom mein)
      brand: "Zeno",
      developer: "@developer_NovaG",
      notice: "This API is exclusively for active users.",
      contact: "To buy this API, message on WhatsApp: +63 962 065 8587 (Serious buyers only: Just sending 'hello' will not get a reply)"
    };

        // Return Formatted (Pretty) JSON
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).send(JSON.stringify(cleanResponse, null, 2));

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
