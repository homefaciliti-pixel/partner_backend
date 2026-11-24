const db = require('../db');
const { resolveDocUrl } = require('../utils/helpers');

// POST /api/partner/support - File a support ticket
exports.createTicket = async (req, res) => {
  const { subject, message } = req.body;
  if (!subject || !message) {
    return res.status(400).json({ error: 'subject and message are required fields' });
  }

  const { name, email, mobile } = req.partner;
  const createdDate = new Date().toLocaleDateString('en-IN');

  try {
    const [result] = await db.query(
      `INSERT INTO support_tickets (userName, email, mobile, subject, message, status, createdAt, partnerId) 
       VALUES (?, ?, ?, ?, ?, 'Open', ?, ?)`,
      [name, email, mobile, subject, message, createdDate, req.partner.id]
    );

    res.status(201).json({
      success: true,
      message: 'Support ticket registered successfully!',
      ticketId: result.insertId
    });
  } catch (error) {
    console.error('Error registering support ticket:', error);
    res.status(500).json({ error: 'Failed to submit support ticket: ' + error.message });
  }
};

// GET /api/partner/support - View partner's own support tickets
exports.getTickets = async (req, res) => {
  const { mobile } = req.partner;
  try {
    const [rows] = await db.query(
      "SELECT * FROM support_tickets WHERE mobile = ? ORDER BY id DESC",
      [mobile]
    );

    const resolvedImage = resolveDocUrl(req.partner.image, req, 'profile');
    const resolvedAadharFront = resolveDocUrl(req.partner.aadharFront || req.partner.aadhaarImage, req, 'document');
    const resolvedAadharBack = resolveDocUrl(req.partner.aadharBack, req, 'document');
    const resolvedPanImage = resolveDocUrl(req.partner.panImage, req, 'document');
    const resolvedPoliceImage = resolveDocUrl(req.partner.policeVerificationImage, req, 'document');
    const documentsArray = [resolvedAadharFront, resolvedAadharBack, resolvedPanImage, resolvedPoliceImage].filter(Boolean);

    const mappedTickets = rows.map(ticket => ({
      ...ticket,
      partnerId: ticket.partnerId || req.partner.id,
      partnerImage: resolvedImage,
      partnerDocuments: documentsArray,
      partner: {
        id: req.partner.id,
        name: req.partner.name,
        email: req.partner.email,
        mobile: req.partner.mobile,
        image: resolvedImage,
        documents: documentsArray
      }
    }));

    res.json(mappedTickets);
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    res.status(500).json([]);
  }
};

// GET /api/partner/reviews - Fetch reviews
exports.getReviews = async (req, res) => {
  const partnerName = req.partner.name;
  try {
    const [rows] = await db.query(
      "SELECT * FROM reviews WHERE partnerName = ? AND status = 1 ORDER BY id DESC",
      [partnerName]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching partner reviews:', error);
    res.status(500).json([]);
  }
};
