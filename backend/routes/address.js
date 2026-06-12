const express = require('express');
const router = express.Router();
const { analyzeAddress } = require('../services/claudeService');
const { geocodeAddress } = require('../services/geocodingService');

router.post('/analyze', async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const analysis = await analyzeAddress(text.trim());

    if (analysis.correctedAddress) {
      const geo = await geocodeAddress(analysis.correctedAddress);
      analysis.latitude = geo.latitude;
      analysis.longitude = geo.longitude;
    } else {
      analysis.latitude = null;
      analysis.longitude = null;
    }

    res.json(analysis);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
