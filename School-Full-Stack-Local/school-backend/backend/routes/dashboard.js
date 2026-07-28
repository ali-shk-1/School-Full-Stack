const router = require('express').Router();
const pool   = require('../db');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

/* ─────────────────────────────────────────
   GET /api/dashboard
   Returns all KPIs for the overview page in one call
───────────────────────────────────────── */
router.get('/', async (req, res, next) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
    const currentYear  = new Date().getFullYear();

    const [
      studentsRes,
      staffRes,
      feesMonthRes,
      expensesMonthRes,
      defaultersRes,
      feesYearRes,
      expensesYearRes,
    ] = await Promise.all([
      // Total students
      pool.query('SELECT COUNT(*) AS total FROM students'),

      // Total active staff
      pool.query('SELECT COUNT(*) AS total FROM staff'),

      // This month: fee totals
      pool.query(
        `SELECT COALESCE(SUM(amount_due), 0) AS total_due,
                COALESCE(SUM(amount_paid), 0) AS total_paid
         FROM fee_payments
         WHERE DATE_TRUNC('month', academic_month) = DATE_TRUNC('month', $1::DATE)`,
        [currentMonth]
      ),

      // This month: expenses total
      pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS total_expenses
         FROM expenses
         WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', $1::DATE)`,
        [currentMonth]
      ),

      // Fee defaulters count this month (admission-date aware, same logic as /api/fees/defaulters)
      pool.query(
        `SELECT COUNT(*) AS total
         FROM students s
         LEFT JOIN fee_payments fp
           ON fp.student_id = s.student_id
           AND DATE_TRUNC('month', fp.academic_month) = DATE_TRUNC('month', $1::DATE)
         LEFT JOIN LATERAL (
           SELECT fp2.amount_due
           FROM fee_payments fp2
           WHERE fp2.student_id = s.student_id
             AND fp2.academic_month < DATE_TRUNC('month', $1::DATE)
           ORDER BY fp2.academic_month DESC
           LIMIT 1
         ) prev ON true
         WHERE s.admission_date <= (DATE_TRUNC('month', $1::DATE) + INTERVAL '1 month' - INTERVAL '1 day')
           AND COALESCE(fp.amount_due, prev.amount_due, 0) > 0
           AND COALESCE(fp.amount_paid, 0) < COALESCE(fp.amount_due, prev.amount_due, 0)`,
        [currentMonth]
      ),

      // Monthly fee trend (current year)
      pool.query(
        `SELECT TO_CHAR(academic_month, 'Mon') AS month,
                SUM(amount_paid) AS collected
         FROM fee_payments
         WHERE EXTRACT(YEAR FROM academic_month) = $1
         GROUP BY DATE_TRUNC('month', academic_month), TO_CHAR(academic_month, 'Mon')
         ORDER BY DATE_TRUNC('month', academic_month)`,
        [currentYear]
      ),

      // Monthly expense trend (current year)
      pool.query(
        `SELECT TO_CHAR(created_at, 'Mon') AS month,
                SUM(amount) AS spent
         FROM expenses
         WHERE EXTRACT(YEAR FROM created_at) = $1
         GROUP BY DATE_TRUNC('month', created_at), TO_CHAR(created_at, 'Mon')
         ORDER BY DATE_TRUNC('month', created_at)`,
        [currentYear]
      ),
    ]);

    res.json({
      kpis: {
        total_students:   parseInt(studentsRes.rows[0].total),
        total_staff:      parseInt(staffRes.rows[0].total),
        fees_due:         parseFloat(feesMonthRes.rows[0].total_due),
        fees_collected:   parseFloat(feesMonthRes.rows[0].total_paid),
        fees_balance:     parseFloat(feesMonthRes.rows[0].total_due) - parseFloat(feesMonthRes.rows[0].total_paid),
        expenses_month:   parseFloat(expensesMonthRes.rows[0].total_expenses),
        fee_defaulters:   parseInt(defaultersRes.rows[0].total),
      },
      charts: {
        monthly_fees:     feesYearRes.rows,
        monthly_expenses: expensesYearRes.rows,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
