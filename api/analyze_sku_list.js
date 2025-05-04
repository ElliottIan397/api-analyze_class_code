import fetch from 'node-fetch';
import { parse } from 'csv-parse/sync';

const CSV_URL = 'https://raw.githubusercontent.com/ElliottIan397/voiceflow2/main/VF_API_TestProject042925.csv';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sku_list } = req.body;

    if (!Array.isArray(sku_list)) {
      return res.status(400).json({ error: 'Invalid input format. Expected sku_list array.' });
    }

    const response = await fetch(CSV_URL);
    const csvText = await response.text();

    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
    });

    let has_micr = false;
    const yield_types = new Set();

    sku_list.forEach(inputSku => {
      const match = records.find(row => row.sku?.trim() === inputSku);
      if (match) {
        const classCode = match.class_code.trim();
        if (classCode === 'MICR') {
          has_micr = true;
        }
        if (['STD', 'HY', 'XHY'].includes(classCode)) {
          yield_types.add(classCode);
        }
      }
    });

    return res.status(200).json({
      has_micr,
      yield_types: Array.from(yield_types),
    });

  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: 'Failed to process SKU list.' });
  }
}
