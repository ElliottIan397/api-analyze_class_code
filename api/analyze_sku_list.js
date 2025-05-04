import fetch from 'node-fetch';
import { parse } from 'csv-parse/sync';

const CSV_URL = 'https://raw.githubusercontent.com/ElliottIan397/voiceflow2/main/VF_API_TestProject042925.csv';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sku_list } = req.body;

    console.log('Incoming sku_list:', sku_list);

    if (!Array.isArray(sku_list)) {
      return res.status(400).json({ error: 'Invalid input format. Expected sku_list array.' });
    }

    const response = await fetch(CSV_URL);
    const csvText = await response.text();

    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
    });

    console.log('Parsed CSV rows (sample):', records.slice(0, 3));

    let has_micr = false;
    const yield_types = new Set();

    sku_list.forEach(inputSku => {
      console.log('Checking input SKU:', inputSku);

      const match = records.find(row => {
        const csvSku = row.sku?.trim();
        return csvSku === inputSku;
      });

      if (match) {
        const classCode = match.class_code?.trim() || '';
        console.log(`Match found for ${inputSku} - class_code: ${classCode}`);

        // Check for MICR
        if (classCode.includes('M')) {
          has_micr = true;
        }

        // Yield logic
        const isHY = classCode.includes('HY');
        const isJumbo = classCode.includes('J');

        if (isHY) yield_types.add('HY');
        if (isJumbo) yield_types.add('JUMBO');

        if (!isHY && !isJumbo) {
          yield_types.add('STD');
        }

      } else {
        console.log(`No match found for ${inputSku}`);
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
