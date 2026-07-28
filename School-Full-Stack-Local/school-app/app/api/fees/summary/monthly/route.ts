export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const month = normalizeMonthInput(searchParams.get('month'))

  const rows = await prisma.$queryRaw<any[]>`
    SELECT
      TO_CHAR(academic_month, 'Month YYYY') AS month_label,
      COUNT(*) AS payment_count,
      SUM(amount_due)  AS total_due,
      SUM(amount_paid) AS total_paid,
      SUM(amount_due - amount_paid) AS total_balance
    FROM fee_payments
    WHERE DATE_TRUNC('month', academic_month) = DATE_TRUNC('month', ${month}::DATE)
    GROUP BY academic_month
  `

  const row = rows[0]

  return NextResponse.json(
    row
      ? {
          month_label: row.month_label,
          payment_count: Number(row.payment_count),
          total_due: Number(row.total_due),
          total_paid: Number(row.total_paid),
          total_balance: Number(row.total_balance),
        }
      : { month_label: null, payment_count: 0, total_due: 0, total_paid: 0, total_balance: 0 }
  )
})