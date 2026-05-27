const router = require('express').Router();
const pool   = require('../db');
const { authenticate, authorize } = require('../middleware/authMiddleware');

// All student routes require authentication
router.use(authenticate);

/* ─────────────────────────────────────────
   GET /api/students
   Query params: class, section, search (name/roll_no)
───────────────────────────────────────── */
router.get('/', async (req, res, next) => {
  try {
    const { class: cls, section, search } = req.query;

    let query  = `SELECT * FROM students WHERE 1=1`;
    const vals = [];
    let   idx  = 1;

    if (cls) {
      query += ` AND class = $${idx++}`;
      vals.push(cls);
    }
    if (section) {
      query += ` AND section = $${idx++}`;
      vals.push(section);
    }
    if (search) {
      query += ` AND (
        LOWER(first_name) LIKE $${idx}   OR
        LOWER(last_name)  LIKE $${idx}   OR
        CAST(roll_no AS TEXT) LIKE $${idx}
      )`;
      vals.push(`%${search.toLowerCase()}%`);
      idx++;
    }

    query += ` ORDER BY class, section, roll_no`;

    const { rows } = await pool.query(query, vals);
    res.json({ count: rows.length, students: rows });
  } catch (err) {
    next(err);
  }
});

/* ─────────────────────────────────────────
   GET /api/students/:id
───────────────────────────────────────── */
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM students WHERE student_id = $1',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Student not found.' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/* ─────────────────────────────────────────
   POST /api/students
   Body: { roll_no, section, class, first_name, last_name,
           father_name?, contact_1?, contact_2?, address? }
───────────────────────────────────────── */
router.post('/', authorize('admin', 'accountant'), async (req, res, next) => {
  try {
    const { roll_no, section, class: cls, first_name, last_name,
            father_name, contact_1, contact_2, address } = req.body;

    if (!roll_no || !section || !cls || !first_name || !last_name) {
      return res.status(400).json({
        error: 'roll_no, section, class, first_name, and last_name are required.',
      });
    }

    const { rows } = await pool.query(
      `INSERT INTO students
         (roll_no, section, class, first_name, last_name,
          father_name, contact_1, contact_2, address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [roll_no, section, cls, first_name, last_name,
       father_name || null, contact_1 || null, contact_2 || null, address || null]
    );

    res.status(201).json({ message: 'Student added.', student: rows[0] });
  } catch (err) {
    next(err);
  }
});

/* ─────────────────────────────────────────
   PUT /api/students/:id
───────────────────────────────────────── */
router.put('/:id', authorize('admin', 'accountant'), async (req, res, next) => {
  try {
    const { roll_no, section, class: cls, first_name, last_name,
            father_name, contact_1, contact_2, address } = req.body;

    if (!roll_no || !section || !cls || !first_name || !last_name) {
      return res.status(400).json({
        error: 'roll_no, section, class, first_name, and last_name are required.',
      });
    }

    const { rows } = await pool.query(
      `UPDATE students SET
         roll_no=$1, section=$2, class=$3, first_name=$4, last_name=$5,
         father_name=$6, contact_1=$7, contact_2=$8, address=$9
       WHERE student_id=$10
       RETURNING *`,
      [roll_no, section, cls, first_name, last_name,
       father_name || null, contact_1 || null, contact_2 || null, address || null,
       req.params.id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Student not found.' });
    res.json({ message: 'Student updated.', student: rows[0] });
  } catch (err) {
    next(err);
  }
});

/* ─────────────────────────────────────────
   DELETE /api/students/:id  — admin only
───────────────────────────────────────── */
router.delete('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM students WHERE student_id = $1 RETURNING student_id, first_name, last_name',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Student not found.' });
    res.json({ message: 'Student deleted.', student: rows[0] });
  } catch (err) {
    next(err);
  }
});

/* ─────────────────────────────────────────
   GET /api/students/meta/classes
   Returns distinct class + section list (for dropdowns)
───────────────────────────────────────── */
router.get('/meta/classes', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT class, section
       FROM students
       ORDER BY class, section`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
