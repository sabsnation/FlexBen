const formatBrl = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportClosingExcel(exportData, period) {
  const XLSX = await import('xlsx')
  const { summary, lines, transactions } = exportData
  const wb = XLSX.utils.book_new()

  const resumoRows = [
    ['FlexBen — Fechamento financeiro'],
    ['Período', summary.referenceMonth],
    ['Total aprovado', summary.approvedTotal],
    ['Movimentos no período', summary.transactionCount],
    ['Pendências em aberto', summary.pendingCount],
    [],
    ['Categoria', 'Qtd. movimentos', 'Valor consolidado (R$)']
  ]
  for (const line of lines) {
    resumoRows.push([line.category, line.count, line.total])
  }
  const wsResumo = XLSX.utils.aoa_to_sheet(resumoRows)
  wsResumo['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 22 }]
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo')

  const detalheHeader = [
    'ID',
    'Data',
    'Colaborador',
    'E-mail',
    'Categoria',
    'Tipo',
    'Valor (R$)',
    'Status',
    'Descrição'
  ]
  const detalheRows = transactions.map((r) => [
    r.id,
    r.data,
    r.usuarioNome,
    r.usuarioEmail,
    r.categoria,
    r.tipo,
    r.valor,
    r.status,
    r.descricao
  ])
  const wsDetalhe = XLSX.utils.aoa_to_sheet([detalheHeader, ...detalheRows])
  wsDetalhe['!cols'] = [
    { wch: 8 },
    { wch: 12 },
    { wch: 22 },
    { wch: 26 },
    { wch: 16 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 36 }
  ]
  XLSX.utils.book_append_sheet(wb, wsDetalhe, 'Movimentações')

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const filename = `fechamento-flexben-${period.year}-${String(period.month).padStart(2, '0')}.xlsx`
  downloadBlob(blob, filename)
}

export async function exportClosingPdf(exportData, period) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ])
  const { summary, lines, transactions } = exportData
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  doc.setFontSize(16)
  doc.text('FlexBen — Fechamento financeiro', 14, 16)
  doc.setFontSize(10)
  doc.setTextColor(80, 80, 80)
  doc.text(`Período: ${summary.referenceMonth}`, 14, 24)
  doc.text(`Total aprovado: ${formatBrl(summary.approvedTotal)}`, 14, 30)
  doc.text(`Movimentos: ${summary.transactionCount}  |  Pendências: ${summary.pendingCount}`, 14, 36)
  doc.setTextColor(0, 0, 0)

  autoTable(doc, {
    startY: 42,
    head: [['Categoria', 'Movimentos', 'Valor consolidado']],
    body: lines.map((l) => [l.category, String(l.count), formatBrl(l.total)]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [99, 102, 241] }
  })

  const afterSummary = doc.lastAutoTable.finalY + 10

  autoTable(doc, {
    startY: afterSummary,
    head: [['ID', 'Data', 'Colaborador', 'Categoria', 'Tipo', 'Valor', 'Status']],
    body: transactions.map((r) => [
      r.id,
      r.data,
      r.usuarioNome,
      r.categoria,
      r.tipo,
      formatBrl(r.valor),
      r.status
    ]),
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [79, 70, 229] },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 22 },
      2: { cellWidth: 40 },
      3: { cellWidth: 28 },
      4: { cellWidth: 18 },
      5: { cellWidth: 28 },
      6: { cellWidth: 22 }
    },
    margin: { left: 14, right: 14 }
  })

  const filename = `fechamento-flexben-${period.year}-${String(period.month).padStart(2, '0')}.pdf`
  doc.save(filename)
}
