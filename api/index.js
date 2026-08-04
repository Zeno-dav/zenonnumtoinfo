import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const { num, Key } = req.query;

  // 1. API Key Check (Missing Key)
  if (!Key) {
    return res.status(401).json({ 
      success: false, 
      message: "API key missing! To BUY this API, message on WhatsApp: +63 9620658587 or Telegram: @Zeno098",
      buy_contact: "WhatsApp: +63 9620658587",
      telegram: "@Zeno098",
      bot: "@No2infobot",
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
      message: "Invalid API key! To BUY a valid API, message on WhatsApp: +63 9620658587 or Telegram: @Zeno098",
      buy_contact: "WhatsApp: +63 9620658587",
      telegram: "@Zeno098",
      bot: "@No2infobot",
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
      message: `This API expired on ${expiryDate.toDateString()}! To RENEW or BUY, message on WhatsApp: +63 9620658587 or Telegram: @Zeno098`,
      buy_contact: "WhatsApp: +63 9620658587",
      telegram: "@Zeno098",
      bot: "@No2infobot",
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
    // 6. Upstream API Data Fetch (Updated Endpoint)
    const response = await fetch(
      `https://num-to-info.sauravsingh2111.workers.dev/lookup/${encodeURIComponent(num)}`
    );

    if (!response.ok) {
      return res.status(response.status).json({ success: false, message: "Upstream API error" });
    }

    const upstreamData = await response.json();

    // 7. Data Extractor Logic for updated structure
    let rawDataArray = [];
    
    if (upstreamData.data && Array.isArray(upstreamData.data)) {
      rawDataArray = upstreamData.data;
    } else if (upstreamData.results && Array.isArray(upstreamData.results)) {
      rawDataArray = upstreamData.results;
    } else if (Array.isArray(upstreamData)) {
      rawDataArray = upstreamData;
    } else if (upstreamData && typeof upstreamData === 'object') {
      rawDataArray = [upstreamData];
    }

    // 7.5 Check if data exists
    if (!rawDataArray || rawDataArray.length === 0) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(200).send(JSON.stringify({
        status: false,
        message: "Database mein data nahi hai (Data not found)",
        number: num,
        developer: "@Zeno098",
        bot: "@No2infobot",
        bought_from: "WhatsApp: +63 9620658587 | Telegram: @Zeno098"
      }, null, 2));
    }

    // Helper function to sanitize string values
    const cleanValue = (val) => {
      if (!val || val === "N/A" || val === "null" || val === "undefined") return "Not Found";
      const cleaned = String(val).replace(/^[^a-zA-Z0-9\s,.-]+/g, '').trim();
      return cleaned.length > 0 ? cleaned : "Not Found";
    };

    // Filter out empty/invalid records
    const validRecords = rawDataArray.filter(record => record && record.name && String(record.name).trim() !== "");

    // Format fields matching the new payload structure
    const formattedRecords = validRecords.map(record => ({
      name: cleanValue(record.name),
      fatherName: cleanValue(record.fname || record.father_name),
      address: cleanValue(record.address),
      circle: cleanValue(record.circle),
      number: cleanValue(record.mobile),
      alternateNumber: cleanValue(record.alt || record.alt_mobile),
      idNumber: cleanValue(record.id),
      email: cleanValue(record.email)
    }));

    // Remove duplicate entries
    const uniqueRecords = formattedRecords.filter((value, index, self) =>
      index === self.findIndex((t) => (
        t.name === value.name && 
        t.fatherName === value.fatherName && 
        t.address === value.address &&
        t.number === value.number
      ))
    );

    if (uniqueRecords.length === 0) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.status(200).send(JSON.stringify({
        status: false,
        message: "Database mein data nahi hai (Data not found)",
        number: num,
        brand: "Zeno",
        bot: "@No2infobot",
        developer: "@Zeno098",
        bought_from: "WhatsApp: +63 9620658587 | Telegram: @Zeno098"
      }, null, 2));
    }

    // 8. Final Clean JSON Output
    const cleanResponse = {
      status: true,
      message: "Data fetched successfully",
      api_user: userRecord.name, 
      number: num,
      total_records: uniqueRecords.length,
      details: uniqueRecords,
      developer: "@Zeno098",
      bot: "@No2infobot",
      bought_from: "WhatsApp: +63 9620658587 | Telegram: @Zeno098",
      notice: "This API is exclusively for active users.",
      buy_more: "To buy more APIs, message on WhatsApp: +63 9620658587 or Telegram: @Zeno098"
    };

    // 9. Send response
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).send(JSON.stringify(cleanResponse, null, 2));

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
