import fs from 'fs';
import path from 'path';

export const maxDuration = 60; 

export default async function handler(req, res) {
  const { num, Key } = req.query;

  if (!Key) {
    return res.status(401).json({
      success: false,
      message: "API key missing! To BUY this API, message on WhatsApp: +63 9620658587 or Telegram: @Zeno098",
      buy_contact: "WhatsApp: +63 9620658587"
    });
  }

  const dbPath = path.join(process.cwd(), 'keys.json');
  let keysData = {};

  if (fs.existsSync(dbPath)) {
    try {
      keysData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (e) {
      return res.status(500).json({ success: false, message: "Error reading database." });
    }
  }

  const userRecord = keysData[Key];
  if (!userRecord) {
    return res.status(403).json({
      success: false,
      message: "Invalid API key! To BUY a valid API, message on WhatsApp: +63 9620658587 or Telegram: @Zeno098"
    });
  }

  const startDate = new Date(userRecord.startDate);
  const expiryDate = new Date(startDate);
  expiryDate.setDate(expiryDate.getDate() + userRecord.days);
  const currentTime = new Date();

  if (currentTime > expiryDate) {
    return res.status(403).json({
      success: false,
      message: `This API expired on ${expiryDate.toDateString()}!`
    });
  }

  const todayStr = currentTime.toISOString().split('T')[0];
  const dailyLimit = userRecord.dailyLimit || 100;

  if (!userRecord.usage || userRecord.usage.date !== todayStr) {
    userRecord.usage = { date: todayStr, count: 0 };
  }

  if (userRecord.usage.count >= dailyLimit) {
    return res.status(429).json({
      success: false,
      message: `Daily limit reached! Your limit is ${dailyLimit} requests/day.`
    });
  }

  if (!num) {
    return res.status(400).json({ success: false, message: "num parameter missing." });
  }

  try {
    // 🔴 BROWSER BYPASS HEADERS (Cloudflare ko bypass karne ke liye)
    const response = await fetch(
      `https://num-info.noobster11001.workers.dev/?key=@noob11001&num=${encodeURIComponent(num)}`,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ 
        success: false, 
        message: "Upstream API error - Cloudflare is blocking Vercel", 
        status_code: response.status,
        details: errorText.substring(0, 300) 
      });
    }

    const upstreamData = await response.json();

    // Usage update code jo aapne picchle code se hata diya tha, wo maine wapas add kar diya hai
    userRecord.usage.count += 1;
    keysData[Key] = userRecord;
    try {
      fs.writeFileSync(dbPath, JSON.stringify(keysData, null, 2), 'utf8');
    } catch (e) {
      console.error("Error saving usage", e);
    }

    let rawDataArray = [];
    if (upstreamData && upstreamData.hiteck_info && upstreamData.hiteck_info.data) {
      rawDataArray = [upstreamData.hiteck_info.data];
    } else if (upstreamData && Array.isArray(upstreamData.data)) {
      rawDataArray = upstreamData.data;
    } else if (Array.isArray(upstreamData)) {
      rawDataArray = upstreamData;
    } else if (upstreamData && typeof upstreamData === 'object' && upstreamData.name) {
      rawDataArray = [upstreamData];
    }

    if (!rawDataArray || rawDataArray.length === 0) {
      return res.status(200).send(JSON.stringify({
        status: false,
        message: "Database mein data nahi hai (Data not found)",
        number: num,
        bot: "@No2infobot",
        bought_from: "WhatsApp: +63 9620658587"
      }, null, 2));
    }

    const cleanValue = (val) => {
      if (val === null || val === undefined || val === "null" || val === "undefined" || val === "N/A") return "Not Found";
      const cleaned = String(val).replace(/!+/g, ', ').replace(/^[^a-zA-Z0-9\s,.-]+/g, '').trim();
      return cleaned.length > 0 ? cleaned : "Not Found";
    };

    const validRecords = rawDataArray.filter(record => record && record.name && String(record.name).trim() !== "");

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

    const uniqueRecords = formattedRecords.filter((value, index, self) =>
      index === self.findIndex((t) => (t.name === value.name && t.address === value.address && t.number === value.number))
    );

    if (uniqueRecords.length === 0) {
      return res.status(200).send(JSON.stringify({
        status: false,
        message: "Database mein data nahi hai (Data not found)",
        number: num,
        bought_from: "WhatsApp: +63 9620658587"
      }, null, 2));
    }

    const cleanResponse = {
      status: true,
      message: "Data fetched successfully",
      api_user: userRecord.name,
      number: num,
      usage: {
        limit: dailyLimit,
        used_today: userRecord.usage.count,
        remaining: dailyLimit - userRecord.usage.count
      },
      total_records: uniqueRecords.length,
      details: uniqueRecords,
      developer: "@Zeno098",
      bought_from: "WhatsApp: +63 9620658587"
    };

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).send(JSON.stringify(cleanResponse, null, 2));

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
