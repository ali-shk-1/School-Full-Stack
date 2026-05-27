
const router = require('express').Router();
const pool   = require('../db');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.use(authenticate);

/* ─────────────────────────────────────────
   POST /api/fees
   Record a fee payment
   Body: { student_id, academic_month (YYYY-MM-DD), amount_due, amount_paid }
───────────────────────────────────────── */
router.post('/', authorize('admin', 'accountant'), async (req, res, next) => {
  try {
    const { student_id, academic_month, amount_due, amount_paid } = req.body;

    if (!student_id || !academic_month || amount_due == null) {
      return res.status(400).json({ error: 'student_id, academic_month, and amount_due are required.' });
    }

    // Validate student exists
    const studentCheck = await pool.query(
      'SELECT student_id FROM students WHERE student_id = $1', [student_id]
    );
    if (studentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const { rows } = await pool.query(
      `INSERT INTO fee_payments (student_id, academic_month, amount_due, amount_paid)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [student_id, academic_month, amount_due, amount_paid || 0]
    );

    res.status(201).json({ message: 'Fee payment recorded.', payment: rows[0] });
  } catch (err) { next(err); }
});
/* ─────────────────────────────────────────
   GET /api/fees
   Query: ?month=YYYY-MM-DD  — all payments for a month
───────────────────────────────────────── */
router.get('/', async (req, res, next) => {
  try {
    const month = req.query.month
      ? req.query.month
      : new Date().toISOString().slice(0, 7) + '-01';

    const classFilter = req.query.class;

    let query = `
      SELECT fp.*,
             s.first_name, s.last_name, s.roll_no, s.class, s.section
      FROM fee_payments fp
      JOIN students s ON s.student_id = fp.student_id
      WHERE DATE_TRUNC('month', fp.academic_month) = DATE_TRUNC('month', $1::DATE)
    `;
    const params = [month];

    if (classFilter) {
      params.push(classFilter);
      query += ` AND s.class = $${params.length}`;
    }

    query += ` ORDER BY s.class, s.roll_no`;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { next(err); }
});

/* ─────────────────────────────────────────
   GET /api/fees/daily
   Query: ?date=YYYY-MM-DD  — all payments on a specific date
───────────────────────────────────────── */
router.get('/daily', async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);

    const { rows } = await pool.query(
      `SELECT fp.*,
              s.first_name, s.last_name, s.roll_no, s.class, s.section
       FROM fee_payments fp
       JOIN students s ON s.student_id = fp.student_id
       WHERE DATE(fp.payment_date) = $1::DATE
       ORDER BY fp.payment_date DESC`,
      [date]
    );
    res.json(rows);
  } catch (err) { next(err); }
});
/* ─────────────────────────────────────────
   GET /api/fees/student/:student_id
   Full fee history for a student
───────────────────────────────────────── */
router.get('/student/:student_id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT fp.*,
              (fp.amount_due - fp.amount_paid) AS balance,
              s.first_name, s.last_name, s.roll_no, s.class, s.section
       FROM fee_payments fp
       JOIN students s ON s.student_id = fp.student_id
       WHERE fp.student_id = $1
       ORDER BY fp.academic_month DESC`,
      [req.params.student_id]
    );
    res.json({ count: rows.length, payments: rows });
  } catch (err) { next(err); }
});

/* ─────────────────────────────────────────
   GET /api/fees/summary/monthly
   Query: ?month=YYYY-MM  (defaults to current month)
   Returns: total_due, total_paid, total_balance, payment count
───────────────────────────────────────── */
router.get('/summary/monthly', async (req, res, next) => {
  try {
        const month = req.query.month
        ? req.query.month
        : new Date().toISOString().slice(0, 7) + '-01';

    const { rows } = await pool.query(
      `SELECT
         TO_CHAR(academic_month, 'Month YYYY') AS month_label,
         COUNT(*) AS payment_count,
         SUM(amount_due)  AS total_due,
         SUM(amount_paid) AS total_paid,
         SUM(amount_due - amount_paid) AS total_balance
       FROM fee_payments
       WHERE DATE_TRUNC('month', academic_month) = DATE_TRUNC('month', $1::DATE)
       GROUP BY academic_month`,
      [month]
    );

    res.json(rows[0] || { month_label: null, payment_count: 0, total_due: 0, total_paid: 0, total_balance: 0 });
  } catch (err) { next(err); }
});

/* ─────────────────────────────────────────
   GET /api/fees/summary/yearly
   Returns month-by-month breakdown for charts
───────────────────────────────────────── */
router.get('/summary/yearly', async (req, res, next) => {
  try {
    const year = req.query.year || new Date().getFullYear();

    const { rows } = await pool.query(
      `SELECT
         TO_CHAR(academic_month, 'Mon YYYY') AS month_label,
         DATE_TRUNC('month', academic_month)  AS month_date,
         SUM(amount_due)  AS total_due,
         SUM(amount_paid) AS total_paid,
         SUM(amount_due - amount_paid) AS total_balance
       FROM fee_payments
       WHERE EXTRACT(YEAR FROM academic_month) = $1
       GROUP BY DATE_TRUNC('month', academic_month), TO_CHAR(academic_month, 'Mon YYYY')
       ORDER BY month_date`,
      [year]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/* ─────────────────────────────────────────
   GET /api/fees/defaulters
   Query: ?month=YYYY-MM  — students with outstanding balance
───────────────────────────────────────── */
router.get('/defaulters', async (req, res, next) => {
  try {
    const month = req.query.month
      ? req.query.month
      : new Date().toISOString().slice(0, 7) + '-01';

    const { rows } = await pool.query(
      `SELECT
         s.student_id, s.roll_no, s.first_name, s.last_name,
         s.class, s.section,
         fp.amount_due,
         fp.amount_paid,
         (fp.amount_due - fp.amount_paid) AS balance
       FROM students s
       INNER JOIN fee_payments fp
         ON s.student_id = fp.student_id
         AND DATE_TRUNC('month', fp.academic_month) = DATE_TRUNC('month', $1::DATE)
       WHERE fp.amount_paid < fp.amount_due
       ORDER BY balance DESC`,
      [month]
    );

    res.json({ count: rows.length, defaulters: rows });
  } catch (err) { next(err); }
});
/* ─────────────────────────────────────────
   PUT /api/fees/:payment_id
   Update an existing payment (partial payment top-up)
───────────────────────────────────────── */
router.put('/:payment_id', authorize('admin', 'accountant'), async (req, res, next) => {
  try {
    const { amount_paid } = req.body;
    if (amount_paid == null) return res.status(400).json({ error: 'amount_paid is required.' });

    const { rows } = await pool.query(
      `UPDATE fee_payments SET amount_paid = $1, payment_date = NOW()
       WHERE payment_id = $2
       RETURNING *`,
      [amount_paid, req.params.payment_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Payment record not found.' });
    res.json({ message: 'Payment updated.', payment: rows[0] });
  } catch (err) { next(err); }
});

/* ─────────────────────────────────────────
   DELETE /api/fees/:payment_id  — admin only
───────────────────────────────────────── */
router.delete('/:payment_id', authorize('admin'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM fee_payments WHERE payment_id = $1 RETURNING payment_id',
      [req.params.payment_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Payment record not found.' });
    res.json({ message: 'Payment deleted.' });
  } catch (err) { next(err); }
});

module.exports = router;
