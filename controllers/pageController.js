const db = require('../db');

// GET all pages
exports.getPages = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM pages ORDER BY id DESC');
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching pages:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pages', error: error.message });
  }
};

// GET single page by ID
exports.getPageById = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT * FROM pages WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Page not found' });
    }
    res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    console.error('Error fetching page:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch page', error: error.message });
  }
};
